import EventEmitter from "node:events";
import {
    type APIMessageComponentEmoji,
    type ButtonInteraction,
    type Client,
    Collection,
    Events,
    type GuildEmoji,
    type GuildMember,
    IntentsBitField,
    type MessageReaction,
    type PartialGuildMember,
    type PartialMessageReaction,
    type PartialUser,
    type ReactionEmoji,
    Role,
    type RoleResolvable,
    type Snowflake,
    type TextChannel,
    type User,
} from "discord.js";

import { SelfRoleManagerEvents } from "./SelfRoleManagerEvents.js";
import type {
    ChannelOptions,
    ChannelProperties,
    RoleToEmojiData,
    SelfRoleOptions,
} from "./types/index.js";
import { addRole, isNullOrWhiteSpaces, removeRole } from "./utils/index.js";

/**
 * The manager handling assignation and removal of roles based on user interactions/reactions.
 *
 * @export
 * @class SelfRoleManager
 * @extends {EventEmitter}
 */
export abstract class SelfRoleManager extends EventEmitter {
    /**
     * The options of the manager.
     *
     * @type {SelfRoleOptions}
     */
    public readonly options: SelfRoleOptions;

    /**
     * The client that instantiated this Manager
     * @name SelfRoleManager#client
     * @type {Client}
     * @readonly
     */
    public readonly client: Client;

    /**
     * The collection of registered channels.
     *
     * @name SelfRoleManager#channels
     * @type {Collection<Snowflake, ChannelProperties>}
     */
    public readonly channels: Collection<Snowflake, ChannelProperties>;

    /**
     * Creates an instance of SelfRoleManager.
     * @param {Client} [client] The client that instantiated this Manager
     * @param {SelfRoleOptions} [options={
     *     deleteAfterUnregistration: false,
     *     channelsMessagesFetchLimit: 3
     *   }]
     */
    constructor(
        client: Client,
        options: SelfRoleOptions = {
            deleteAfterUnregistration: false,
            channelsMessagesFetchLimit: 3,
        },
    ) {
        super();

        const intents = new IntentsBitField(client.options.intents);
        if (!intents.has(IntentsBitField.Flags.Guilds)) {
            throw new Error("GUILDS intent is required to use this package!");
        }
        if (!intents.has(IntentsBitField.Flags.GuildMembers)) {
            throw new Error(
                "GUILD_MEMBERS intent is required to use this package!",
            );
        }

        this.client = client;
        this.options = options;
        this.channels = new Collection<Snowflake, ChannelProperties>();

        this.on(
            SelfRoleManagerEvents.channelRegister,
            async (channel: TextChannel, channelOptions: ChannelOptions) =>
                this.sendsMessageAndRegisterChannel(channel, channelOptions),
        );
        if (this.options.deleteAfterUnregistration) {
            this.on(
                SelfRoleManagerEvents.channelUnregister,
                async (channel: TextChannel, channelOptions: ChannelOptions) =>
                    this.#deleteMessageWhenChannelGetsUnregistered(
                        channel,
                        channelOptions,
                    ),
            );
        }
    }

    /**
     * Registers a channel. When a user reacts to the message in it, a role will be given/removed.
     *
     * @name SelfRoleManager#registerChannel
     * @param {Snowflake} channelID
     * @param {ChannelOptions} options
     */
    async registerChannel(channelID: Snowflake, options: ChannelOptions) {
        if (!this.client.isReady()) {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                "The client is not ready yet!",
            );
            return;
        }

        const channel = await this.client.channels.fetch(channelID);
        if (channel) {
            this.emit(SelfRoleManagerEvents.channelRegister, channel, options);
        } else {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                `There is no channel with the id ${channelID}`,
            );
        }
    }

    /**
     * Unregisters a channel. When a user reacts to the message in it, nothing will happen.
     *
     * @name SelfRoleManager#unregisterChannel
     * @param {Snowflake} channelID
     */
    async unregisterChannel(channelID: Snowflake) {
        if (!this.client.isReady()) {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                "The client is not ready yet!",
            );
            return;
        }

        const channel = await this.client.channels.fetch(channelID);
        if (channel) {
            const properties = this.channels.get(channelID);
            if (!properties) {
                this.emit(
                    SelfRoleManagerEvents.error,
                    null,
                    `There is no channel registered with the id ${channelID}`,
                );
                return;
            }

            const isDeleted = this.channels.delete(channelID);
            if (isDeleted) {
                this.client.off(
                    Events.GuildMemberUpdate,
                    properties.rolesChangesListener,
                );
                this.emit(
                    SelfRoleManagerEvents.channelUnregister,
                    channel,
                    properties.options,
                );
            } else {
                this.emit(
                    SelfRoleManagerEvents.error,
                    null,
                    `The channel with the id ${channelID} could not get unregistered`,
                );
            }
        } else {
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                `There is no channel with the id ${channelID}`,
            );
        }
    }

    /**
     * Handle the registering of a channel, sending the main message for the automated role-giver system.
     *
     * @param channel
     * @param channelOptions
     */
    protected abstract sendsMessageAndRegisterChannel(
        channel: TextChannel,
        channelOptions: ChannelOptions,
    ): Promise<void>;

    /**
     * Handle the behaviour once a user adds a reaction or clicks on a button.
     * @param userAction the user action, whether it is a reaction or a button interaction
     * @param user the user who did the action
     * @param isReactionRemoval invert the logic of the action (only for reactions)
     */
    protected abstract handleUserAction(
        userAction:
            | ButtonInteraction
            | MessageReaction
            | PartialMessageReaction,
        user?: User | PartialUser | null,
        isReactionRemoval?: boolean | null,
    ): Promise<void>;

    /**
     * Returns the RTE (and its role) based on the emoji provided.
     * @param sender the button component or message reaction
     * @param channelOptions the channel options
     * @param emoji the emoji clicked
     * @returns The proper RoteToEmojiData
     */
    protected getRTE(
        sender: ButtonInteraction | MessageReaction | PartialMessageReaction,
        channelOptions: ChannelOptions,
        emoji?: GuildEmoji | ReactionEmoji | APIMessageComponentEmoji | null,
    ): RoleToEmojiData | undefined {
        if (!emoji) return;

        const emojiIdentifier = isNullOrWhiteSpaces(emoji.id)
            ? emoji.name
            : emoji.toString();
        return channelOptions.rolesToEmojis.find(
            (rte: RoleToEmojiData) => rte.emoji === emojiIdentifier,
        );
    }

    /**
     * Handle the unregistering of a channel, deleting the main message inside.
     *
     * @param channel
     * @param options
     */
    async #deleteMessageWhenChannelGetsUnregistered(
        channel: TextChannel,
        options: ChannelOptions,
    ) {
        const message = options.message.id
            ? await channel.messages.fetch(options.message.id)
            : (await channel.messages.fetch()).first();

        if (message) {
            await message.delete();
            this.emit(SelfRoleManagerEvents.messageDelete, message);
        }
    }

    protected async userHasReachedMaxRoles(
        member: GuildMember,
        userAction:
            | ButtonInteraction
            | MessageReaction
            | PartialMessageReaction,
        numberOfMemberManagedRoles: number,
        numberOfMaxRolesAssigned: number | undefined,
        role: Role,
    ) {
        this.emit(
            SelfRoleManagerEvents.maxRolesReach,
            member,
            userAction,
            numberOfMemberManagedRoles,
            numberOfMaxRolesAssigned,
            role,
        );
    }

    protected async userHasMissingRequiredRoles(
        member: GuildMember,
        userAction:
            | ButtonInteraction
            | MessageReaction
            | PartialMessageReaction,
        role: Role,
        requiredRoles: RoleResolvable[] | undefined,
    ) {
        this.emit(
            SelfRoleManagerEvents.requiredRolesMissing,
            member,
            userAction,
            role,
            requiredRoles,
        );
    }

    protected async userCanBeAddedToRole(
        member: GuildMember,
        role: Role,
        userAction:
            | ButtonInteraction
            | MessageReaction
            | PartialMessageReaction,
    ) {
        const updatedMember = await addRole(member, role);
        if (updatedMember !== null)
            this.emit(
                SelfRoleManagerEvents.roleAdd,
                role,
                updatedMember,
                userAction,
            );
        else
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                `The role ${role?.name} could not be added to ${member.nickname}`,
                [role, member],
            );
    }

    protected async userCanBeRemovedFromRole(
        member: GuildMember,
        role: Role,
        userAction:
            | ButtonInteraction
            | MessageReaction
            | PartialMessageReaction,
    ) {
        const updatedMember = await removeRole(member, role);
        if (updatedMember !== null)
            this.emit(
                SelfRoleManagerEvents.roleRemove,
                role,
                updatedMember,
                userAction,
            );
        else
            this.emit(
                SelfRoleManagerEvents.error,
                null,
                `The role ${role?.name} could not be added to ${member.nickname}`,
                [role, member],
            );
    }

    protected generateRolesChangesListener(
        rolesToEmojis: RoleToEmojiData[],
    ): (
        oldMember: GuildMember | PartialGuildMember,
        newMember: GuildMember,
    ) => Promise<void> {
        return async (
            oldMember: GuildMember | PartialGuildMember,
            newMember: GuildMember,
        ) => {
            const rolesToRemove = rolesToEmojis.filter(
                (rte) =>
                    rte.requiredRoles?.some((role) => {
                        return (
                            oldMember.roles.resolve(role) &&
                            !newMember.roles.resolve(role)
                        );
                    }) ?? false,
            );
            for (const { role } of rolesToRemove) {
                const roleToRemove =
                    role instanceof Role
                        ? role
                        : await newMember.guild.roles.fetch(role);
                if (roleToRemove) {
                    const user = await removeRole(newMember, roleToRemove);
                    if (user) {
                        this.emit(
                            SelfRoleManagerEvents.roleRemove,
                            roleToRemove,
                            newMember,
                            null,
                        );
                    }
                }
            }
        };
    }
}
