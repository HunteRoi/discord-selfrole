import {
    type APIMessageComponentEmoji,
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    ButtonStyle,
    type Client,
    Events,
    type GuildEmoji,
    type GuildMember,
    type Interaction,
    type Message,
    type ReactionEmoji,
    Role,
    StringSelectMenuBuilder,
    type StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
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
const selectMenuPrefix: string = "select-menu-";
const buttonPrefix: string = "button-";
const MAX_VALUES = 25;

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
                    (interaction.isButton() ||
                        interaction.isStringSelectMenu()) &&
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
        sender: ButtonInteraction | StringSelectMenuInteraction,
        channelOptions: ChannelOptions,
        emoji?: GuildEmoji | ReactionEmoji | APIMessageComponentEmoji | null,
    ): RoleToEmojiData | RoleToEmojiData[] | undefined {
        if (!sender || !channelOptions) return;

        if (sender.isButton()) {
            if (sender.customId.startsWith(`${packagePrefix}${buttonPrefix}`)) {
                const targetRoleId = sender.customId.substring(
                    packagePrefix.length + buttonPrefix.length,
                );
                return channelOptions.rolesToEmojis.find(
                    (rte: RoleToEmojiData) =>
                        rte.role.toString() === targetRoleId,
                );
            }
            if (
                sender.customId.startsWith(
                    `${packagePrefix}${selectMenuPrefix}`,
                )
            ) {
                return [];
            }
        }
        if (
            sender.isStringSelectMenu() &&
            sender.customId.startsWith(`${packagePrefix}${selectMenuPrefix}`) &&
            sender.values.length > 0
        ) {
            return channelOptions.rolesToEmojis.filter((rte: RoleToEmojiData) =>
                sender.values.includes(rte.role.toString()),
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
            (msg: Message) => msg.author.id === this.client.user?.id,
        );
        let message: Message | undefined = selfRoleBotMessages.first();

        if (message && message.components.length > 0) {
            this.emit(SelfRoleManagerEvents.messageRetrieve, message);
        } else {
            const clippedRolesToEmojis = channelOptions.rolesToEmojis.slice(
                0,
                MAX_VALUES,
            ); // Discord only allows 25 options in a select menu
            const roles = await Promise.all(
                clippedRolesToEmojis.map(async (clippedRoleToEmoji) =>
                    clippedRoleToEmoji.role instanceof Role
                        ? clippedRoleToEmoji.role
                        : await channel.guild.roles.fetch(clippedRoleToEmoji.role)
                )
            );
            const minValues = channelOptions.selectMenu?.minValues
                ? Math.min(
                    Math.max(1, channelOptions.selectMenu.minValues),
                    clippedRolesToEmojis.length,
                    MAX_VALUES,
                )
                : undefined;
            const maxValues = channelOptions.selectMenu?.maxValues
                ? Math.min(
                    Math.max(1, channelOptions.selectMenu.maxValues),
                    clippedRolesToEmojis.length,
                    MAX_VALUES,
                )
                : undefined;

            const components = channelOptions.selectMenu
                ? [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder({
                            min_values: minValues,
                            max_values: maxValues,
                            custom_id: `${packagePrefix}${selectMenuPrefix}roles`,
                            placeholder:
                                channelOptions.selectMenu?.placeholder ??
                                "Select a role",
                        }).addOptions(
                            clippedRolesToEmojis.map((rte: RoleToEmojiData, index: number) => {
                                return new StringSelectMenuOptionBuilder()
                                    .setEmoji(rte.emoji.toString())
                                    .setLabel(
                                        roles[index]?.name ?? rte.role.toString(),
                                    )
                                    .setValue(
                                        roles[index]?.id ?? rte.role.toString()
                                    )
                                    .setDescription(rte.smallNote ?? " ");
                            }),
                        ),
                    ),
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `${packagePrefix}${selectMenuPrefix}reset`,
                            )
                            .setEmoji(
                                channelOptions.selectMenu.resetButton
                                    ?.emoji ?? "🔄",
                            )
                            .setLabel(
                                channelOptions.selectMenu.resetButton
                                    ?.label ?? "Reset",
                            )
                            .setStyle(
                                channelOptions.selectMenu.resetButton
                                    ?.style ?? ButtonStyle.Danger,
                            ),
                    ),
                ]
                : clippedRolesToEmojis
                    .reduce(
                        // Split the roles into chunks of 5 (because Discord only allows 5 buttons per row)
                        (
                            rteByFive: RoleToEmojiData[][],
                            currentRte: RoleToEmojiData,
                            index: number,
                        ) => {
                            const chunkIndex = Math.floor(index / 5);
                            if (!rteByFive[chunkIndex])
                                rteByFive[chunkIndex] = [];
                            rteByFive[chunkIndex].push(currentRte);
                            return rteByFive;
                        },
                        [],
                    )
                    .map((rteData: RoleToEmojiData[]) =>
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            ...rteData.map((rte: RoleToEmojiData, index: number) =>
                                new ButtonBuilder()
                                    .setEmoji(rte.emoji.toString())
                                    .setCustomId(
                                        `${packagePrefix}${buttonPrefix}${roles[index]?.id ?? rte.role.toString()}`,
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
        userAction: ButtonInteraction | StringSelectMenuInteraction,
    ): Promise<void> {
        if (!userAction.inGuild()) return;

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

        if (
            !channelOptions.selectMenu &&
            userAction.isButton() &&
            userAction.customId.startsWith(`${packagePrefix}${buttonPrefix}`)
        ) {
            this.#handleButtonInteraction(userAction, channelOptions, member);
        } else if (
            channelOptions.selectMenu &&
            userAction.isButton() &&
            userAction.customId.startsWith(
                `${packagePrefix}${selectMenuPrefix}`,
            )
        ) {
            this.#handleResetButtonForStringSelectMenuInteraction(
                userAction,
                channelOptions,
                member,
            );
        } else if (
            channelOptions.selectMenu &&
            userAction.isStringSelectMenu() &&
            userAction.customId.startsWith(
                `${packagePrefix}${selectMenuPrefix}`,
            )
        ) {
            this.#handleStringSelectMenuInteraction(
                userAction,
                channelOptions,
                member,
            );
        }
    }

    /**
     * Handles the user button interaction by either giving or removing a role.
     *
     * @param userAction the user action, which is a button interaction
     * @param channelOptions the options for the channel where the interaction happened
     * @param member the guild member who interacted with the button
     */
    async #handleButtonInteraction(
        userAction: ButtonInteraction,
        channelOptions: ChannelOptions,
        member: GuildMember,
    ): Promise<void> {
        const rteData = this.getRTE(userAction, channelOptions);
        if (!rteData || Array.isArray(rteData)) {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                "This emoji cannot be found!",
            );
            return;
        }

        const role =
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

        this.emit(SelfRoleManagerEvents.interaction, rteData, userAction);
        await this.#manageUserRoles(userAction, channelOptions, role, rteData);
    }

    /**
     * Handles the user interaction with the reset button to remove all roles assigned by the select menu.
     *
     * @param userAction the user action, wihch is a button interaction to reset all roles of the user
     * @param channelOptions the options for the channel where the interaction happened
     * @param member the guild member who interacted with the button
     */
    async #handleResetButtonForStringSelectMenuInteraction(
        userAction: ButtonInteraction,
        channelOptions: ChannelOptions,
        member: GuildMember,
    ): Promise<void> {
        const memberRoles = [...member.roles.cache.values()];
        const rolesToRemove = memberRoles.filter((role: Role) =>
            channelOptions.rolesToEmojis
                .map((rte) => rte.role)
                .includes(role.id),
        );
        const relatedRte = channelOptions.rolesToEmojis.filter((rte) =>
            rolesToRemove
                .map((role) => role.id)
                .includes(rte.role instanceof Role ? rte.role.id : rte.role),
        );

        this.emit(SelfRoleManagerEvents.interaction, relatedRte, userAction);
        while (rolesToRemove.length > 0) {
            const role = rolesToRemove.pop();
            if (!role) continue;
            await this.userCanBeRemovedFromRole(member, role, userAction);
        }
    }

    /**
     * Handles the user menu selection interaction by either giving or removing a role.
     *
     * @param userAction the user action, which is a select menu interaction to manage the user's roles
     * @param channelOptions the options for the channel where the interaction happened
     * @param member the guild member who interacted with the select menu
     */
    async #handleStringSelectMenuInteraction(
        userAction: StringSelectMenuInteraction,
        channelOptions: ChannelOptions,
        member: GuildMember,
    ): Promise<void> {
        const rte = this.getRTE(userAction, channelOptions);
        if (!rte) {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                "This emoji cannot be found!",
            );
            return;
        }
        const rteData = Array.isArray(rte) ? rte : [rte];

        const rolesFromEmojis = channelOptions.rolesToEmojis.map(
            (rte: RoleToEmojiData) =>
                rte.role instanceof Role ? rte.role.id : rte.role,
        );
        this.emit(SelfRoleManagerEvents.interaction, rteData, userAction);

        const memberRoles = [...member.roles.cache.values()];
        const memberManagedRoles = memberRoles.filter((role: Role) =>
            rolesFromEmojis.includes(role.id),
        );
        const managedRolesUnselected = memberManagedRoles.filter(
            (role: Role) => !rteData.map((rte) => rte.role).includes(role.id),
        );
        const managedRolesAlreadySelectedBefore = memberManagedRoles.filter(
            (role: Role) => rteData.map((rte) => rte.role).includes(role.id),
        );
        await this.#removeUnselectedRoles(
            userAction,
            managedRolesUnselected,
            channelOptions,
        );
        await this.#addSelectedRoles(
            userAction,
            rteData,
            managedRolesAlreadySelectedBefore,
            channelOptions,
        );
    }

    async #addSelectedRoles(
        userAction: StringSelectMenuInteraction,
        rteData: RoleToEmojiData[],
        managedRolesAlreadySelectedBefore: Role[],
        channelOptions: ChannelOptions,
    ) {
        for (const rte of rteData) {
            const role =
                rte.role instanceof Role
                    ? rte.role
                    : await userAction.message.guild?.roles.fetch(rte.role);
            if (!role) {
                this.emit(
                    SelfRoleManagerEvents.error,
                    null,
                    `The role ${rte.role} could not be found`,
                );
                continue;
            }
            if (managedRolesAlreadySelectedBefore.includes(role)) continue; // ignore already present roles

            await this.#manageUserRoles(userAction, channelOptions, role, rte);
        }
    }

    async #removeUnselectedRoles(
        userAction: StringSelectMenuInteraction,
        managedRolesUnselected: Role[],
        channelOptions: ChannelOptions,
    ) {
        for (const role of managedRolesUnselected) {
            const rte = channelOptions.rolesToEmojis.find(
                (rte: RoleToEmojiData) =>
                    (rte.role instanceof Role ? rte.role.id : rte.role) ===
                    role.id,
            );
            if (!rte) continue;

            await this.#manageUserRoles(userAction, channelOptions, role, rte);
        }
    }

    async #manageUserRoles(
        userAction: ButtonInteraction | StringSelectMenuInteraction,
        channelOptions: ChannelOptions,
        role: Role,
        rteData: RoleToEmojiData,
    ) {
        const member = await userAction.guild?.members.fetch({
            user: userAction.user.id,
            force: true,
        });
        if (!member) return;
        const memberRoles = [...member.roles.cache.values()];
        const memberManagedRoles = memberRoles.filter((role: Role) =>
            channelOptions.rolesToEmojis
                .map((rte) => rte.role)
                .includes(role.id),
        );

        const maxRolesReached =
            channelOptions.maxRolesAssigned &&
            memberManagedRoles.length >= channelOptions.maxRolesAssigned;
        const memberHasRole = memberRoles.some((r: Role) => role === r);
        const userHasRequiredRoles =
            rteData.requiredRoles?.every((r) =>
                r instanceof Role
                    ? memberRoles.includes(r)
                    : memberRoles
                        .map((memberRole: Role) => memberRole.id)
                        .includes(r),
            ) ?? true;

        const userWantsToAddRole = !memberHasRole;
        const userWantsToRemoveRole = memberHasRole;

        switch (true) {
            case userWantsToAddRole && maxRolesReached:
                await this.userHasReachedMaxRoles(
                    member,
                    userAction,
                    memberManagedRoles.length,
                    channelOptions.maxRolesAssigned,
                    role,
                );
                break;
            case userWantsToAddRole && !userHasRequiredRoles:
                await this.userHasMissingRequiredRoles(
                    member,
                    userAction,
                    role,
                    rteData.requiredRoles,
                );
                break;
            case userWantsToAddRole:
                await this.userCanBeAddedToRole(member, role, userAction);
                break;
            case userWantsToRemoveRole:
                await this.userCanBeRemovedFromRole(member, role, userAction);
                break;
        }
    }
}
