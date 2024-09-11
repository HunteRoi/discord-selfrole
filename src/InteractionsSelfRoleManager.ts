import {
    type APIMessageComponentEmoji,
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonComponent,
    type ButtonInteraction,
    ButtonStyle,
    type Client,
    Events,
    type GuildEmoji,
    type Interaction,
    type Message,
    type ReactionEmoji,
    Role,
    type TextChannel,
} from "discord.js";

import { SelfRoleManager } from "./SelfRoleManager.js";
import { SelfRoleManagerEvents } from "./SelfRoleManagerEvents.js";
import type {
    ChannelOptions,
    InteractionsSelfRoleOptions,
    RoleToEmojiData,
} from "./types/index.js";
import { constructMessageOptions } from "./utils/index.js";

const packagePrefix: string = "sr-";

/**
 * A class that manages self-assignable roles using interactions.
 *
 * @export
 * @extends SelfRoleManager
 */
export class InteractionsSelfRoleManager extends SelfRoleManager {
    /**
     * Creates an instance of InteractionsSelfRoleManager.
     * @param {Client} [client] The client that instantiated this Manager
     * @param {InteractionsSelfRoleOptions} [options={
     *     deleteAfterUnregistration: false,
     *     channelsMessagesFetchLimit: 3
     *   }]
     */
    constructor(
        client: Client,
        options: InteractionsSelfRoleOptions = {
            deleteAfterUnregistration: false,
            channelsMessagesFetchLimit: 3,
            useReactions: false,
        },
    ) {
        super(client, options);

        this.client.on(
            "interactionCreate",
            async (interaction: Interaction) => {
                if (
                    interaction.isButton() &&
                    interaction.customId.startsWith(packagePrefix)
                ) {
                    await interaction.deferReply({
                        ephemeral: true,
                        fetchReply: true,
                    });
                    await this.handleUserAction(interaction);
                }
            },
        );
    }

    /** @inheritdoc */
    protected getRTE(
        sender: ButtonInteraction,
        channelOptions: ChannelOptions,
        emoji?: GuildEmoji | ReactionEmoji | APIMessageComponentEmoji | null,
    ): RoleToEmojiData | undefined {
        if (!sender || !channelOptions || !emoji) return;

        const button = sender.component as ButtonComponent;
        if (button.customId) {
            const targetRoleId = button.customId.substring(
                packagePrefix.length,
            );
            return channelOptions.rolesToEmojis.find(
                (rte: RoleToEmojiData) => rte.role.toString() === targetRoleId,
            );
        }

        return super.getRTE(sender, channelOptions, emoji);
    }

    /** @inheritdoc */
    protected async sendsMessageAndRegisterChannel(
        channel: TextChannel,
        channelOptions: ChannelOptions,
    ): Promise<void> {
        const channelMessages = await channel.messages.fetch({
            limit: this.options.channelsMessagesFetchLimit,
        });
        const selfRoleBotMessages = channelMessages.filter(
            (msg: Message) =>
                msg.author.id === this.client.user?.id &&
                msg.reactions.cache.size === 0,
        );
        let message: Message | undefined;

        if (selfRoleBotMessages && selfRoleBotMessages.size > 0) {
            message = selfRoleBotMessages.first();
            this.emit(SelfRoleManagerEvents.messageRetrieve, message);
        } else {
            const components = channelOptions.rolesToEmojis
                .slice(0, 25)
                .reduce(
                    (
                        rteByFive: RoleToEmojiData[][],
                        currentRte: RoleToEmojiData,
                        index: number,
                    ) => {
                        const chunkIndex = Math.floor(index / 5);
                        if (!rteByFive[chunkIndex]) rteByFive[chunkIndex] = [];
                        rteByFive[chunkIndex].push(currentRte);
                        return rteByFive;
                    },
                    [],
                )
                .map((rteData: RoleToEmojiData[]) =>
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        ...rteData.map((rte: RoleToEmojiData) =>
                            new ButtonBuilder()
                                .setEmoji(rte.emoji.toString())
                                .setCustomId(
                                    `${packagePrefix}${
                                        rte.role instanceof Role
                                            ? rte.role.id
                                            : rte.role
                                    }`,
                                )
                                .setStyle(ButtonStyle.Secondary),
                        ),
                    ),
                );
            const messageOptions = constructMessageOptions(
                channelOptions,
                components,
            );
            message = await channel.send(messageOptions);
            this.emit(SelfRoleManagerEvents.messageCreate, message);
        }

        const rolesChangesListener = this.generateRolesChangesListener(
            channelOptions.rolesToEmojis,
        ).bind(this);
        this.client.on(Events.GuildMemberUpdate, rolesChangesListener);

        if (!this.channels.has(channel.id)) {
            this.channels.set(channel.id, {
                options: {
                    ...channelOptions,
                    message: { ...channelOptions.message, id: message?.id },
                },
                rolesChangesListener,
            });
        }
    }

    /** @inheritdoc */
    protected async handleUserAction(
        userAction: ButtonInteraction,
        user?: null,
        isReactionRemoval?: null,
    ): Promise<void> {
        if (!userAction.guild) return;

        const message = userAction.message;
        if (!message || message.author?.id !== this.client.user?.id) return;

        const memberId = userAction.member?.user.id;
        if (!memberId) return;
        const member = await message.guild?.members.fetch(memberId);
        if (!member || member.user.bot) return;

        const channelOptions = this.channels.get(
            userAction.message.channelId,
        )?.options;
        if (!channelOptions) return;

        const rteData = this.getRTE(userAction, channelOptions);
        if (!rteData) {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                "This emoji cannot be found!",
            );
            return;
        }

        const rolesFromEmojis = channelOptions.rolesToEmojis.map(
            (rte: RoleToEmojiData) => rte.role,
        );
        const memberRoles = [...member.roles.cache.values()];
        const memberManagedRoles = memberRoles.filter((role: Role) =>
            rolesFromEmojis.includes(role.id),
        );
        const maxRolesReached =
            channelOptions.maxRolesAssigned &&
            memberManagedRoles.length >= channelOptions.maxRolesAssigned;
        const memberHasRole = memberRoles.some((role: Role) =>
            rteData.role instanceof Role
                ? rteData.role === role
                : rteData.role === role.id,
        );

        this.emit(SelfRoleManagerEvents.interaction, rteData, userAction);

        const userWantsToRemoveRole = memberHasRole;
        const userWantsToAddRole = !memberHasRole;

        const role: Role | undefined | null =
            rteData.role instanceof Role
                ? rteData.role
                : await userAction.message.guild?.roles.fetch(rteData.role);
        if (!role) {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                `The role ${rteData.role} could not be found`,
            );
            return;
        }

        const userHasRequiredRoles =
            rteData.requiredRoles?.every((role) =>
                role instanceof Role
                    ? memberRoles.includes(role)
                    : memberRoles.map((r) => r.id).includes(role),
            ) ?? true;

        switch (true) {
            case userWantsToAddRole && maxRolesReached:
                this.userHasReachedMaxRoles(
                    member,
                    userAction,
                    memberManagedRoles.length,
                    channelOptions.maxRolesAssigned,
                    role,
                );
                break;
            case userWantsToAddRole && !userHasRequiredRoles:
                this.userHasMissingRequiredRoles(
                    member,
                    userAction,
                    role,
                    rteData.requiredRoles,
                );
                break;
            case userWantsToAddRole:
                this.userCanBeAddedToRole(member, role, userAction);
                break;
            case userWantsToRemoveRole:
                this.userCanBeRemovedFromRole(member, role, userAction);
                break;
        }
    }
}
