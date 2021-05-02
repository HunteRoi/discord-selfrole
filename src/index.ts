import { Client, Collection, Snowflake, ClientOptions } from 'discord.js';
import EventEmitter from 'events';

import { ChannelOptions, SelfRoleOptions } from './types';
import { handleUnregistering, handleRegistering, handleReaction } from './handlers';

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

    this.client = client;
    this.options = options;
    this.channels = new Collection<Snowflake, ChannelOptions>();

    this.client.on('messageReactionAdd', async (messageReaction, user) => handleReaction(this, messageReaction, user));
    this.client.on('messageReactionRemove', async (messageReaction, user) => handleReaction(this, messageReaction, user, true));

    this.on('channelRegister', async (channel, options) => handleRegistering(this, channel, options));
    if (this.options.deleteAfterUnregistration) {
      this.on('channelUnregister', async (channel, options) => handleUnregistering(this, channel, options));
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
      options.channelID = channelID;
      this.channels.set(channelID, options);
      this.emit('channelRegister', channel, options);
    } else {
      this.emit('error', null, `There is no channel with the id ${channelID}`);
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
        this.emit('channelUnregister', channel, options);
      } else {
        this.emit('error', null, `The channel with the id ${channelID} could not get unregistered`);
      }
    } else {
      this.emit('error', null, `There is no channel with the id ${channelID}`);
    }
  }
}

/**
 * A wrapper of {@link Client} that provides a support for the SelfRoleManager.
 * @export
 * @class ClientWithSelfRoleManager
 * @extends {Client}
 */
export class ClientWithSelfRoleManager extends Client {
  /**
   * An instance of {@link SelfRoleManager} that currently manages all the channels which have automated role-react messages for the client.
   *
   * @name ClientWithSelfRoleManager#selfRoleManager
   * @type {SelfRoleManager}
   */
  public readonly selfRoleManager: SelfRoleManager;

  /**
   *Creates an instance of ClientWithSelfRoleManager.
   * @param {ClientOptions} [options] Options for the client
   * @param {SelfRoleOptions} [selfRoleOptions={
   *     deleteAfterUnregistration: false
   *     channelsMessagesFetchLimit: 3
   *   }]
   */
  constructor(
    options?: ClientOptions,
    selfRoleOptions: SelfRoleOptions = {
      deleteAfterUnregistration: false,
      channelsMessagesFetchLimit: 3,
    }
  ) {
    super(options);

    this.selfRoleManager = new SelfRoleManager(this, selfRoleOptions);
  }
}

/**
 * Emitted when a channel is registered.
 * @event SelfRoleManager#channelRegister
 * @param {TextChannel} channel The channel reference
 * @param {ChannelOptions} options The channel options
 * @example
 * manager.on('channelRegister', (channel, options) => {});
 */

/**
 * Emitted when a channel is unregistered.
 * @event SelfRoleManager#channelUnregister
 * @param {TextChannel} channel The channel reference
 * @param {ChannelOptions} options The channel options
 * @example
 * manager.on('channelUnregister', (channel, options) => {});
 */

/**
 * Emitted when an error occurs.
 * @event SelfRoleManager#error
 * @param {Error} error The error object
 * @param {string} message The message of the error
 * @example
 * manager.on('error', (error, message) => {});
 */

/**
 * Emitted when a message is retrieved.
 * @event SelfRoleManager#messageRetrieve
 * @param {Message} message 
 * @example
 * manager.on('messageRetrieve', (message) => {});
 */

/**
 * Emitted when a message is created.
 * @event SelfRoleManager#messageCreate
 * @param {Message} message 
 * @example
 * manager.on('messageCreate', (message) => {});
 */

/**
 * Emitted when a message is deleted.
 * @event SelfRoleManager#messageDelete
 * @param {Message} message 
 * @example
 * manager.on('messageDelete', (message) => {});
 */

/**
 * Emitted when a role is removed.
 * @event SelfRoleManager#roleRemove
 * @param {RoleResolvable} role 
 * @param {GuildMember} member
 * @example
 * manager.on('roleRemove', (role, member) => {});
 */

/**
 * Emitted when a role is added.
 * @event SelfRoleManager#roleAdd
 * @param {RoleResolvable} role 
 * @param {GuildMember} member
 * @example
 * manager.on('roleAdd', (role, member) => {});
 */

/**
 * Emitted when a reaction is added.
 * @event SelfRoleManager#reactionAdd
 * @param {RoleToEmojiData} rte 
 * @param {Message} message
 * @example
 * manager.on('reactionAdd', (rte, message) => {});
 */

/**
 * Emitted when a reaction is removed.
 * @event SelfRoleManager#reactionRemove
 * @param {RoleToEmojiData} rte 
 * @param {Message} message
 * @example
 * manager.on('reactionRemove', (rte, message) => {});
 */

/**
 * Emitted when the maximum of roles is reached for the member.
 * @event SelfRoleManager#maxRolesReach
 * @param {GuildMember} member
 * @example
 * manager.on('maxRolesReach', (member) => {});
 */