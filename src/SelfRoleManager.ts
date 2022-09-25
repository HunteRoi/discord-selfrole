import EventEmitter from 'events';
import {
  Client,
  Collection,
  IntentsBitField,
  Interaction,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  Snowflake,
  TextChannel,
  User,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  MessageOptions,
  Role,
  ButtonInteraction,
  GuildMember,
  ButtonComponent,
} from 'discord.js';

import { SelfRoleManagerEvents } from './SelfRoleManagerEvents';
import { ChannelOptions, RoleToEmojiData, SelfRoleOptions } from './types';
import { generateMessage, isNullOrWhiteSpaces, addRole, removeRole } from './utils';

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
   * @type {Collection<Snowflake, ChannelOptions>}
   */
  public readonly channels: Collection<Snowflake, ChannelOptions>;

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
    }
  ) {
    super();

    const intents = new IntentsBitField(client.options.intents);

    if (!intents.has(IntentsBitField.Flags.Guilds)) {
      throw new Error('GUILDS intent is required to use this package!');
    }
    if (!intents.has(IntentsBitField.Flags.GuildMembers)) {
      throw new Error('GUILD_MEMBERS intent is required to use this package!');
    }
    if (options.useReactions) {
      if (!intents.has(IntentsBitField.Flags.GuildMessages)) {
        throw new Error(
          'GUILD_MESSAGES intent is required to use this package!'
        );
      }
      if (!intents.has(IntentsBitField.Flags.GuildMessageReactions)) {
        throw new Error(
          'GUILD_MESSAGE_REACTIONS intent is required to use this package!'
        );
      }
    } else {
      if (!intents.has(IntentsBitField.Flags.GuildIntegrations)) {
        throw new Error(
          'GUILD_INTEGRATIONS intent is required to use this package!'
        );
      }
    }

    this.client = client;
    this.options = options;
    this.channels = new Collection<Snowflake, ChannelOptions>();

    if (this.options.useReactions) {
      this.client.on(
        'messageReactionAdd',
        async (
          messageReaction: MessageReaction | PartialMessageReaction,
          user: User | PartialUser
        ) => this.#handleReaction(this, messageReaction, user)
      );
      this.client.on(
        'messageReactionRemove',
        async (
          messageReaction: MessageReaction | PartialMessageReaction,
          user: User | PartialUser
        ) => this.#handleReaction(this, messageReaction, user, true)
      );
    } else {
      this.client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isButton()) {
          await interaction.deferReply({
            ephemeral: true,
            fetchReply: true,
          });

          await this.#handleInteraction(this, interaction);
        }
      });
    }

    this.on(
      SelfRoleManagerEvents.channelRegister,
      async (channel: TextChannel, channelOptions: ChannelOptions) =>
        this.#handleRegistering(this, channel, channelOptions)
    );
    if (this.options.deleteAfterUnregistration) {
      this.on(
        SelfRoleManagerEvents.channelUnregister,
        async (channel: TextChannel, channelOptions: ChannelOptions) =>
          this.#handleUnregistering(this, channel, channelOptions)
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
    const channel = await this.client.channels.fetch(channelID);
    if (channel) {
      this.channels.set(channelID, options);
      this.emit(SelfRoleManagerEvents.channelRegister, channel, options);
    } else {
      this.emit(
        SelfRoleManagerEvents.error,
        null,
        `There is no channel with the id ${channelID}`
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
    const channel = await this.client.channels.fetch(channelID);
    if (channel) {
      const options = this.channels.get(channelID);
      const isDeleted = this.channels.delete(channelID);
      if (isDeleted) {
        this.emit(SelfRoleManagerEvents.channelUnregister, channel, options);
      } else {
        this.emit(
          SelfRoleManagerEvents.error,
          null,
          `The channel with the id ${channelID} could not get unregistered`
        );
      }
    } else {
      this.emit(
        SelfRoleManagerEvents.error,
        null,
        `There is no channel with the id ${channelID}`
      );
    }
  }

  /**
   * Handle the registering of a channel, sending the main message for the automated role-giver system.
   *
   * @param manager
   * @param channel
   * @param options
   */
  async #handleRegistering(
    manager: SelfRoleManager,
    channel: TextChannel,
    options: ChannelOptions
  ) {
    let messages = await channel.messages.fetch({
      limit: manager.options.channelsMessagesFetchLimit,
    });

    messages = messages.filter(
      (msg: Message) =>
        msg.author.id === manager.client.user.id &&
        (manager.options.useReactions
          ? msg.reactions.cache.size > 0
          : msg.reactions.cache.size === 0)
    );
    let id: Snowflake;
    if (messages && messages.size > 0) {
      const message = messages.first();
      id = message.id;
      manager.emit(SelfRoleManagerEvents.messageRetrieve, message);
    } else {
      let actionRowBuilder: ActionRowBuilder<ButtonBuilder>;
      const content = generateMessage(manager, options);

      if (!manager.options.useReactions) {
        actionRowBuilder = new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...options.rolesToEmojis
            .slice(0, 5) // a maximum of 5 buttons can be created per action row
            .map((rte: RoleToEmojiData) =>
              new ButtonBuilder()
                .setEmoji(rte.emoji)
                .setCustomId(rte.role instanceof Role ? rte.role.id : rte.role)
                .setStyle(ButtonStyle.Secondary)
            )
        );
      }

      const messageToSend: MessageOptions = {};

      if (actionRowBuilder) {
        messageToSend.components = [actionRowBuilder];
      }

      if (content instanceof EmbedBuilder) {
        messageToSend.embeds = [content];
      } else {
        messageToSend.content = content;
      }

      const message = await channel.send(messageToSend);
      id = message.id;
      manager.emit(SelfRoleManagerEvents.messageCreate, message);
      if (manager.options.useReactions) {
        await Promise.all(
          options.rolesToEmojis.map((rte) =>
            message.react(rte.emoji).then(() => rte)
          )
        );
      }
    }

    if (manager.channels.has(channel.id)) {
      manager.channels.set(channel.id, {
        ...options,
        message: { ...options.message, id },
      });
    }
  }

  /**
   * Handle the unregistering of a channel, deleting the main message inside.
   *
   * @param manager
   * @param channel
   * @param options
   */
  async #handleUnregistering(
    manager: SelfRoleManager,
    channel: TextChannel,
    options: ChannelOptions
  ) {
    const messages = await channel.messages.fetch(options.message.id);

    let message: Message;
    if (messages instanceof Collection) {
      message = messages.first();
    } else if (messages instanceof Message) message = messages;

    if (message) {
      await message.delete();
      manager.emit(SelfRoleManagerEvents.messageDelete, message);
    }
  }

  /**
   * Handles the interaction by granting or removing the related role to the provided guild member.
   *
   * @param manager
   * @param interaction
   * @returns
   */
  async #handleInteraction(
    manager: SelfRoleManager,
    interaction: ButtonInteraction
  ) {
    const message = interaction.message;
    if (message.author.id !== manager.client.user.id) return;

    const member = interaction.member as GuildMember;
    if (member.user.bot) return;

    const channelOptions = manager.channels.get(interaction.channelId);
    if (!channelOptions) return;

    const button = interaction.component as ButtonComponent;
    const emoji = button.emoji;
    const roleToEmoji: RoleToEmojiData = button.customId
      ? channelOptions.rolesToEmojis.find(
        (rte: RoleToEmojiData) => rte.role.toString() === button.customId
      )
      : isNullOrWhiteSpaces(emoji.id)
        ? channelOptions.rolesToEmojis.find(
          (rte: RoleToEmojiData) => rte.emoji === emoji.name
        )
        : channelOptions.rolesToEmojis.find(
          (rte: RoleToEmojiData) => rte.emoji === emoji.toString()
        );
    if (!roleToEmoji) {
      manager.emit(
        SelfRoleManagerEvents.error,
        null,
        'This emoji cannot be found!'
      );
      return;
    }

    const channelRoles = channelOptions.rolesToEmojis.map(
      (rte: RoleToEmojiData) => rte.role
    );
    const memberRoles = [...member.roles.cache.values()];
    const rolesFromChannel = memberRoles.filter((role: Role) =>
      channelRoles.includes(role.id)
    );

    const maxRolesReach =
      channelOptions.maxRolesAssigned &&
      rolesFromChannel.length >= channelOptions.maxRolesAssigned;
    const remove = rolesFromChannel.some(
      (role: Role) => role === roleToEmoji.role || role.id === roleToEmoji.role
    );

    manager.emit(SelfRoleManagerEvents.interaction, roleToEmoji, interaction);

    if (remove) {
      const success = await removeRole(member, roleToEmoji.role);
      if (success) {
        manager.emit(
          SelfRoleManagerEvents.roleRemove,
          roleToEmoji.role,
          member,
          interaction
        );
      }
    } else if (!maxRolesReach) {
      const success = await addRole(member, roleToEmoji.role);
      if (success) {
        manager.emit(
          SelfRoleManagerEvents.roleAdd,
          roleToEmoji.role,
          member,
          interaction
        );
      }
    } else {
      manager.emit(
        SelfRoleManagerEvents.maxRolesReach,
        member,
        interaction,
        rolesFromChannel.length,
        channelOptions.maxRolesAssigned
      );
    }
  }

  /**
   * Handles the reaction addition/removal by granting or removing the related role to the provided guild member.
   *
   * @param manager
   * @param messageReaction
   * @param user
   * @param remove
   * @returns
   */
  async #handleReaction(
    manager: SelfRoleManager,
    messageReaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    remove = false
  ) {
    const message = messageReaction.message;
    if (message.author.id !== manager.client.user.id) return;

    const member = await message.guild.members.fetch(user.id);
    if (member.user.bot) return;

    const channelOptions = manager.channels.get(message.channel.id);
    if (!channelOptions) return;

    const emoji = messageReaction.emoji;
    const roleToEmoji: RoleToEmojiData = isNullOrWhiteSpaces(emoji.id)
      ? channelOptions.rolesToEmojis.find(
        (rte: RoleToEmojiData) => rte.emoji === emoji.name
      )
      : channelOptions.rolesToEmojis.find(
        (rte: RoleToEmojiData) => rte.emoji === emoji.toString()
      );

    if (!roleToEmoji) {
      manager.emit(
        SelfRoleManagerEvents.error,
        null,
        'This emoji cannot be found!'
      );
      return;
    }

    const channelRoles = channelOptions.rolesToEmojis.map(
      (rte: RoleToEmojiData) => rte.role
    );
    const memberRoles = [...member.roles.cache.values()];
    const nbRolesFromChannel = memberRoles.filter((role: Role) =>
      channelRoles.includes(role.id)
    ).length;
    const maxRolesReach =
      channelOptions.maxRolesAssigned &&
      nbRolesFromChannel >= channelOptions.maxRolesAssigned;

    manager.emit(
      remove
        ? SelfRoleManagerEvents.reactionRemove
        : SelfRoleManagerEvents.reactionAdd,
      roleToEmoji,
      message
    );

    if (remove ? !roleToEmoji.removeOnReact : roleToEmoji.removeOnReact) {
      const success = await removeRole(member, roleToEmoji.role);
      if (success)
        manager.emit(SelfRoleManagerEvents.roleRemove, roleToEmoji.role, member);
    } else if (!maxRolesReach) {
      const success = await addRole(member, roleToEmoji.role);
      if (success)
        manager.emit(SelfRoleManagerEvents.roleAdd, roleToEmoji.role, member);
    } else {
      manager.emit(SelfRoleManagerEvents.maxRolesReach, member);
    }
  }
}

/**
 * Emitted when a channel is registered.
 * @event SelfRoleManager#channelRegister
 * @param {TextChannel} channel The channel reference
 * @param {ChannelOptions} options The channel options
 * @example
 * manager.on(SelfRoleManagerEvents.channelRegister, (channel, options) => {});
 */

/**
 * Emitted when a channel is unregistered.
 * @event SelfRoleManager#channelUnregister
 * @param {TextChannel} channel The channel reference
 * @param {ChannelOptions} options The channel options
 * @example
 * manager.on(SelfRoleManagerEvents.channelUnregister, (channel, options) => {});
 */

/**
 * Emitted when an error occurs.
 * @event SelfRoleManager#error
 * @param {Error} error The error object
 * @param {string} message The message of the error
 * @example
 * manager.on(SelfRoleManagerEvents.error, (error, message) => {});
 */

/**
 * Emitted when a message is retrieved.
 * @event SelfRoleManager#messageRetrieve
 * @param {Message} message
 * @example
 * manager.on(SelfRoleManagerEvents.messageRetrieve, (message) => {});
 */

/**
 * Emitted when a message is created.
 * @event SelfRoleManager#messageCreate
 * @param {Message} message
 * @example
 * manager.on(SelfRoleManagerEvents.messageCreate, (message) => {});
 */

/**
 * Emitted when a message is deleted.
 * @event SelfRoleManager#messageDelete
 * @param {Message} message
 * @example
 * manager.on(SelfRoleManagerEvents.messageDelete, (message) => {});
 */

/**
 * Emitted when a role is removed.
 * @event SelfRoleManager#roleRemove
 * @param {RoleResolvable} role
 * @param {GuildMember} member
 * @param {ButtonInteraction} interaction
 * @example
 * manager.on(SelfRoleManagerEvents.roleRemove, (role, member, interaction) => {});
 */

/**
 * Emitted when a role is added.
 * @event SelfRoleManager#roleAdd
 * @param {RoleResolvable} role
 * @param {GuildMember} member
 * @param {ButtonInteraction} interaction
 * @example
 * manager.on(SelfRoleManagerEvents.roleAdd, (role, member, interaction) => {});
 */

/**
 * Emitted when a reaction is added.
 * @event SelfRoleManager#reactionAdd
 * @param {RoleToEmojiData} rte
 * @param {Message} message
 * @example
 * manager.on(SelfRoleManagerEvents.reactionAdd, (rte, message) => {});
 */

/**
 * Emitted when a reaction is removed.
 * @event SelfRoleManager#reactionRemove
 * @param {RoleToEmojiData} rte
 * @param {Message} message
 * @example
 * manager.on(SelfRoleManagerEvents.reactionRemove, (rte, message) => {});
 */

/**
 * Emitted when the maximum of roles is reached for the member.
 * @event SelfRoleManager#maxRolesReach
 * @param {GuildMember} member
 * @param {ButtonInteraction | null} interaction
 * @param {number | null} nbRoles
 * @param {number | null} maximumRoles
 * @example
 * manager.on(SelfRoleManagerEvents.maxRolesReach, (member, interaction, nbRoles, maximumRoles) => {});
 */

/**
 * Emitted when an interaction is made.
 * @event SelfRoleManager#interaction
 * @param {RoleToEmojiData} rte
 * @param {ButtonInteraction} interaction
 * @example
 * manager.on(SelfRoleManagerEvents.interaction, (rte, interaction) => {});
 */
