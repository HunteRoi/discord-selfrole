import {
    type Client,
    Events,
    IntentsBitField,
    type Message,
    type MessageReaction,
    type PartialMessageReaction,
    type PartialUser,
    Role,
    type TextChannel,
    type User,
} from "discord.js";

import { SelfRoleManager } from "./SelfRoleManager.js";
import { SelfRoleManagerEvents } from "./SelfRoleManagerEvents.js";
import type {
    ChannelOptions,
    ReactionsSelfRoleOptions,
    RoleToEmojiData,
} from "./types/index.js";
import { constructMessageOptions } from "./utils/index.js";

/**
 * A class that manages self-assignable roles using reactions.
 *
 * @export
 * @extends SelfRoleManager
 * @deprecated Discord has encouraged people to use interactions instead of reactions. See {@link InteractionsSelfRoleManager}.
 */
export class ReactionsSelfRoleManager extends SelfRoleManager {
    /**
     * Creates an instance of ReactionsSelfRoleManager.
     * @param {Client} [client] The client that instantiated this Manager
     * @param {ReactionsSelfRoleOptions} [options={
     *     deleteAfterUnregistration: false,
     *     channelsMessagesFetchLimit: 3,
     *     useReactions: true,
     *   }]
     */
    constructor(
        client: Client,
        options: ReactionsSelfRoleOptions = {
            deleteAfterUnregistration: false,
            channelsMessagesFetchLimit: 3,
            useReactions: true,
        },
    ) {
        super(client, options);

        const intents = new IntentsBitField(client.options.intents);
        if (!intents.has(IntentsBitField.Flags.GuildMessageReactions)) {
            throw new Error(
                "GUILD_MESSAGE_REACTIONS intent is required to use this package!",
            );
        }

        this.client.on(
            "messageReactionAdd",
            async (
                messageReaction: MessageReaction | PartialMessageReaction,
                user: User | PartialUser,
            ) => this.handleUserAction(messageReaction, user, false),
        );
        this.client.on(
            "messageReactionRemove",
            async (
                messageReaction: MessageReaction | PartialMessageReaction,
                user: User | PartialUser,
            ) => this.handleUserAction(messageReaction, user, true),
        );
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
            (message: Message) =>
                message.author.id === this.client.user?.id &&
                message.reactions.cache.size > 0,
        );

        let message: Message | undefined;
        const channelAlreadyContainsMessages =
            selfRoleBotMessages && selfRoleBotMessages.size > 0;
        if (channelAlreadyContainsMessages) {
            message = selfRoleBotMessages.first();
            this.emit(SelfRoleManagerEvents.messageRetrieve, message);
        } else {
            const messageOptions = constructMessageOptions(channelOptions, []);
            message = await channel.send(messageOptions);
            this.emit(SelfRoleManagerEvents.messageCreate, message);
            await Promise.all(
                channelOptions.rolesToEmojis.map((rte) =>
                    message?.react(rte.emoji),
                ),
            );
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
        userAction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser,
        isReactionRemoval: boolean,
    ): Promise<void> {
        if (!userAction.message.guild) return;

        const message = userAction.message;
        if (!message || message.author?.id !== this.client.user?.id) return;

        const memberId = user?.id;
        if (!memberId) return;
        const member = await message.guild?.members.fetch(memberId);
        if (!member || member.user.bot) return;

        const channelOptions = this.channels.get(
            userAction.message.channelId,
        )?.options;
        if (!channelOptions) return;

        const emoji = userAction.emoji;
        const rteData = this.getRTE(userAction, channelOptions, emoji);
        if (!rteData || Array.isArray(rteData)) {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                "This emoji cannot be found!",
            );
            return;
        }
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

        const rolesFromEmojis = channelOptions.rolesToEmojis.map(
            (rte: RoleToEmojiData) => rte.role,
        );
        const memberRoles = [...member.roles.cache.values()];
        const memberManagedRoles = memberRoles.filter((r: Role) =>
            rolesFromEmojis.includes(r.id),
        );
        const maxRolesReached =
            channelOptions.maxRolesAssigned &&
            memberManagedRoles.length >= channelOptions.maxRolesAssigned;
        const memberHasRole = memberRoles.some((r: Role) => role === r);

        this.emit(
            isReactionRemoval
                ? SelfRoleManagerEvents.reactionRemove
                : SelfRoleManagerEvents.reactionAdd,
            rteData,
            message,
        );

        const userWantsToRemoveRole =
            memberHasRole &&
            ((!rteData.removeOnReact && isReactionRemoval) ||
                (rteData.removeOnReact && !isReactionRemoval));
        const userWantsToAddRole =
            !memberHasRole &&
            ((!rteData.removeOnReact && !isReactionRemoval) ||
                (rteData.removeOnReact && isReactionRemoval));

        const userHasRequiredRoles =
            rteData.requiredRoles?.every((r) =>
                r instanceof Role
                    ? memberRoles.includes(r)
                    : memberRoles
                          .map((memberRole: Role) => memberRole.id)
                          .includes(r),
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
