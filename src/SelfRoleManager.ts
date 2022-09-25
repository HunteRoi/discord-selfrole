import {
  ButtonInteraction,
  Client,
  Collection,
  IntentsBitField,
  Interaction,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  RoleResolvable,
  Snowflake,
  TextChannel,
  User,
} from 'discord.js';
import EventEmitter from 'events';

import { SelfRoleManagerEvents } from './SelfRoleManagerEvents';
import { ChannelOptions, SelfRoleOptions } from './types';
import {
  handleInteraction,
  handleReaction,
  handleRegistering,
  handleUnregistering,
} from './handlers';

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
        ) => handleReaction(this, messageReaction, user)
      );
      this.client.on(
        'messageReactionRemove',
        async (
          messageReaction: MessageReaction | PartialMessageReaction,
          user: User | PartialUser
        ) => handleReaction(this, messageReaction, user, true)
      );
    } else {
      this.client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isButton()) {
          await interaction.deferReply({
            ephemeral: true,
            fetchReply: true,
          });

          await handleInteraction(this, interaction);
        }
      });
    }

    this.on(
      SelfRoleManagerEvents.channelRegister,
      async (channel: TextChannel, channelOptions: ChannelOptions) =>
        handleRegistering(this, channel, channelOptions)
    );
    if (this.options.deleteAfterUnregistration) {
      this.on(
        SelfRoleManagerEvents.channelUnregister,
        async (channel: TextChannel, channelOptions: ChannelOptions) =>
          handleUnregistering(this, channel, channelOptions)
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
