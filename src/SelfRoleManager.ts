import EventEmitter from "node:events";
import {
    type APIMessageComponentEmoji,
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonComponent,
    ButtonInteraction,
    ButtonStyle,
    type Client,
    Collection,
    Events,
    type GuildEmoji,
    type GuildMember,
    IntentsBitField,
    type Interaction,
    type Message,
    type MessageReaction,
    type PartialGuildMember,
    type PartialMessageReaction,
    type PartialUser,
    type ReactionEmoji,
    Role,
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
import {
    addRole,
    constructMessageOptions,
    isNullOrWhiteSpaces,
    removeRole,
} from "./utils/index.js";

const packagePrefix: string = "sr-";

/**
 * The manager handling assignation and removal of roles based on user interactions/reactions.
 *
 * @export
 * @class SelfRoleManager
 * @extends {EventEmitter}
 */
export class SelfRoleManager extends EventEmitter {
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
        if (options.useReactions) {
            if (!intents.has(IntentsBitField.Flags.GuildMessages)) {
                throw new Error(
                    "GUILD_MESSAGES intent is required to use this package!",
                );
            }
            if (!intents.has(IntentsBitField.Flags.GuildMessageReactions)) {
                throw new Error(
                    "GUILD_MESSAGE_REACTIONS intent is required to use this package!",
                );
            }
        }

        this.client = client;
        this.options = options;
        this.channels = new Collection<Snowflake, ChannelProperties>();

        if (this.options.useReactions) {
            this.client.on(
                "messageReactionAdd",
                async (
                    messageReaction: MessageReaction | PartialMessageReaction,
                    user: User | PartialUser,
                ) => this.#handleUserAction(messageReaction, user, false),
            );
            this.client.on(
                "messageReactionRemove",
                async (
                    messageReaction: MessageReaction | PartialMessageReaction,
                    user: User | PartialUser,
                ) => this.#handleUserAction(messageReaction, user, true),
            );
        } else {
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
                        await this.#handleUserAction(interaction);
                    }
                },
            );
        }

        this.on(
            SelfRoleManagerEvents.channelRegister,
            async (channel: TextChannel, channelOptions: ChannelOptions) =>
                this.#sendsMessageAndRegisterChannel(channel, channelOptions),
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
     * Returns the RTE (and its role) based on the emoji provided.
     * @param sender the button component or message reaction
     * @param channelOptions the channel options
     * @param emoji the emoji clicked
     * @returns The proper RoteToEmojiData
     */
    #getRTE(
        sender: ButtonInteraction | MessageReaction | PartialMessageReaction,
        channelOptions: ChannelOptions,
        emoji?: GuildEmoji | ReactionEmoji | APIMessageComponentEmoji | null,
    ): RoleToEmojiData | undefined {
        if (!emoji) return;

        if (sender instanceof ButtonInteraction) {
            const button = sender.component as ButtonComponent;
            if (button.customId) {
                const targetRoleId = button.customId.substring(
                    packagePrefix.length,
                );
                return channelOptions.rolesToEmojis.find(
                    (rte: RoleToEmojiData) =>
                        rte.role.toString() === targetRoleId,
                );
            }
        }

        const emojiIdentifier = isNullOrWhiteSpaces(emoji.id)
            ? emoji.name
            : emoji.toString();
        return channelOptions.rolesToEmojis.find(
            (rte: RoleToEmojiData) => rte.emoji === emojiIdentifier,
        );
    }

    /**
     * Handle the registering of a channel, sending the main message for the automated role-giver system.
     *
     * @param channel
     * @param channelOptions
     */
    async #sendsMessageAndRegisterChannel(
        channel: TextChannel,
        channelOptions: ChannelOptions,
    ) {
        const channelMessages = await channel.messages.fetch({
            limit: this.options.channelsMessagesFetchLimit,
        });
        const selfRoleBotMessages = channelMessages.filter(
            (message: Message) =>
                message.author.id === this.client.user?.id &&
                (this.options.useReactions
                    ? message.reactions.cache.size > 0
                    : message.reactions.cache.size === 0),
        );
        let message: Message | undefined;

        if (selfRoleBotMessages && selfRoleBotMessages.size > 0) {
            message = selfRoleBotMessages.first();
            this.emit(SelfRoleManagerEvents.messageRetrieve, message);
        } else {
            const components = !this.options.useReactions
                ? channelOptions.rolesToEmojis
                      .slice(0, 25)
                      .reduce(
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
                      )
                : [];
            const messageOptions = constructMessageOptions(
                channelOptions,
                components,
            );
            message = await channel.send(messageOptions);
            this.emit(SelfRoleManagerEvents.messageCreate, message);

            if (this.options.useReactions) {
                await Promise.all(
                    channelOptions.rolesToEmojis.map((rte) =>
                        message?.react(rte.emoji),
                    ),
                );
            }
        }

        const rolesChangesListener = this.#generateRolesChangesListener(
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

    async #handleUserAction(
        interaction: ButtonInteraction,
        user?: null,
        isReactionRemoval?: null,
    ): Promise<void>;
    async #handleUserAction(
        messageReaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser,
        isReactionRemoval: boolean,
    ): Promise<void>;
    async #handleUserAction(
        userAction:
            | ButtonInteraction
            | MessageReaction
            | PartialMessageReaction,
        user?: User | PartialUser | null,
        isReactionRemoval?: boolean | null,
    ): Promise<void> {
        const isButtonInteraction = userAction instanceof ButtonInteraction;

        // check that everything happens in a guild
        if (isButtonInteraction && !userAction.guild) return;
        if (!isButtonInteraction && !userAction.message.guild) return;

        const message = userAction.message;
        if (!message || message.author?.id !== this.client.user?.id) return;

        const memberId =
            isButtonInteraction && userAction.member
                ? userAction.member.user.id
                : user?.id;
        if (!memberId) return;
        const member = await message.guild?.members.fetch(memberId);
        if (!member || member.user.bot) return;

        const channelOptions = this.channels.get(
            userAction.message.channelId,
        )?.options;
        if (!channelOptions) return;

        const emoji = isButtonInteraction
            ? userAction.component.emoji
            : userAction.emoji;
        const rteData = this.#getRTE(userAction, channelOptions, emoji);
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

        if (isButtonInteraction) {
            this.emit(SelfRoleManagerEvents.interaction, rteData, userAction);
        } else {
            this.emit(
                isReactionRemoval
                    ? SelfRoleManagerEvents.reactionRemove
                    : SelfRoleManagerEvents.reactionAdd,
                rteData,
                message,
            );
        }

        const userWantsToRemoveRole = isButtonInteraction
            ? memberHasRole
            : memberHasRole &&
              ((!rteData.removeOnReact && isReactionRemoval) ||
                  (rteData.removeOnReact && !isReactionRemoval));
        const userWantsToAddRole = isButtonInteraction
            ? !memberHasRole
            : !memberHasRole &&
              ((!rteData.removeOnReact && !isReactionRemoval) ||
                  (rteData.removeOnReact && isReactionRemoval));
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

        let updatedMember: GuildMember | null;
        switch (true) {
            case userWantsToAddRole && maxRolesReached:
                this.emit(
                    SelfRoleManagerEvents.maxRolesReach,
                    member,
                    userAction,
                    memberManagedRoles.length,
                    channelOptions.maxRolesAssigned,
                    role,
                );
                break;
            case userWantsToAddRole && !userHasRequiredRoles:
                this.emit(
                    SelfRoleManagerEvents.requiredRolesMissing,
                    member,
                    userAction,
                    role,
                    rteData.requiredRoles,
                );
                break;
            case userWantsToAddRole:
                updatedMember = await addRole(member, role);
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
                break;
            case userWantsToRemoveRole:
                updatedMember = await removeRole(member, role);
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
                break;
        }
    }

    #generateRolesChangesListener(
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
