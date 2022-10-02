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
  Message,
  Role,
  ButtonInteraction,
  ButtonComponent,
  GuildEmoji,
  ReactionEmoji,
  APIMessageComponentEmoji,
  GuildMemberRoleManager,
  RoleResolvable,
} from 'discord.js';

import { SelfRoleManagerEvents } from './SelfRoleManagerEvents';
import { ChannelOptions, RoleToEmojiData, SelfRoleOptions } from './types';
import { isNullOrWhiteSpaces, addRole, removeRole, constructMessageOptions } from './utils';

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
  constructor(client: Client, options: SelfRoleOptions = { deleteAfterUnregistration: false, channelsMessagesFetchLimit: 3 }) {
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
        throw new Error('GUILD_MESSAGES intent is required to use this package!');
      }
      if (!intents.has(IntentsBitField.Flags.GuildMessageReactions)) {
        throw new Error('GUILD_MESSAGE_REACTIONS intent is required to use this package!');
      }
    } else {
      if (!intents.has(IntentsBitField.Flags.GuildIntegrations)) {
        throw new Error('GUILD_INTEGRATIONS intent is required to use this package!');
      }
    }

    this.client = client;
    this.options = options;
    this.channels = new Collection<Snowflake, ChannelOptions>();

    if (this.options.useReactions) {
      this.client.on('messageReactionAdd', async (messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.#handleUserAction(messageReaction, user, false)
      );
      this.client.on('messageReactionRemove', async (messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.#handleUserAction(messageReaction, user, true)
      );
    } else {
      this.client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isButton()) {
          await interaction.deferReply({ ephemeral: true, fetchReply: true });
          await this.#handleUserAction(interaction);
        }
      });
    }

    this.on(SelfRoleManagerEvents.channelRegister, async (channel: TextChannel, channelOptions: ChannelOptions) => this.#sendsMessageAndRegisterChannel(channel, channelOptions));
    if (this.options.deleteAfterUnregistration) {
      this.on(SelfRoleManagerEvents.channelUnregister, async (channel: TextChannel, channelOptions: ChannelOptions) => this.#deleteMessageWhenChannelGetsUnregistered(channel, channelOptions));
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
      this.emit(SelfRoleManagerEvents.channelRegister, channel, options);
    } else {
      this.emit(SelfRoleManagerEvents.error, null, `There is no channel with the id ${channelID}`);
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
        this.emit(SelfRoleManagerEvents.error, null, `The channel with the id ${channelID} could not get unregistered`);
      }
    } else {
      this.emit(SelfRoleManagerEvents.error, null, `There is no channel with the id ${channelID}`);
    }
  }

  /**
   * Returns the RTE (and its role) based on the emoji provided.
   * @param sender the button component or message reaction
   * @param channelOptions the channel options
   * @param emoji the emoji clicked
   * @returns The proper RoteToEmojiData
   */
  #getRTE(sender: ButtonInteraction | MessageReaction | PartialMessageReaction, channelOptions: ChannelOptions, emoji: GuildEmoji | ReactionEmoji | APIMessageComponentEmoji): RoleToEmojiData {
    if (sender instanceof ButtonInteraction) {
      const button = sender.component as ButtonComponent;
      if (button.customId) return channelOptions.rolesToEmojis.find((rte: RoleToEmojiData) => rte.role.toString() === button.customId);
    }

    const emojiIdentifier = isNullOrWhiteSpaces(emoji.id) ? emoji.name : emoji.toString();
    return channelOptions.rolesToEmojis.find((rte: RoleToEmojiData) => rte.emoji === emojiIdentifier);
  }

  /**
   * Handle the registering of a channel, sending the main message for the automated role-giver system.
   *
   * @param channel
   * @param channelOptions
   */
  async #sendsMessageAndRegisterChannel(channel: TextChannel, channelOptions: ChannelOptions) {
    const channelMessages = await channel.messages.fetch({ limit: this.options.channelsMessagesFetchLimit });
    const selfRoleBotMessages = channelMessages.filter((message: Message) => message.author.id === this.client.user.id && (this.options.useReactions ? message.reactions.cache.size > 0 : message.reactions.cache.size === 0));
    let message: Message;

    if (selfRoleBotMessages && selfRoleBotMessages.size > 0) {
      message = selfRoleBotMessages.first();
      this.emit(SelfRoleManagerEvents.messageRetrieve, message);
    } else {
      const buttonComponentRow: ActionRowBuilder<ButtonBuilder> = !this.options.useReactions && new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...channelOptions.rolesToEmojis
          .slice(0, 5) // a maximum of 5 buttons can be created per action row
          .map((rte: RoleToEmojiData) =>
            new ButtonBuilder()
              .setEmoji(rte.emoji)
              .setCustomId(rte.role instanceof Role ? rte.role.id : rte.role)
              .setStyle(ButtonStyle.Secondary)
          )
      );
      const messageOptions = constructMessageOptions(channelOptions, [this.options.descriptionPrefix, this.options.descriptionSuffix], buttonComponentRow);
      message = await channel.send(messageOptions);
      this.emit(SelfRoleManagerEvents.messageCreate, message);

      if (this.options.useReactions) {
        await Promise.all(channelOptions.rolesToEmojis.map((rte) => message.react(rte.emoji)));
      }
    }

    if (!this.channels.has(channel.id)) {
      this.channels.set(channel.id, { ...channelOptions, message: { ...channelOptions.message, id: message.id } });
    }
  }

  /**
   * Handle the unregistering of a channel, deleting the main message inside.
   *
   * @param channel
   * @param options
   */
  async #deleteMessageWhenChannelGetsUnregistered(channel: TextChannel, options: ChannelOptions) {
    const message = options.message.id ? await channel.messages.fetch(options.message.id) : (await channel.messages.fetch()).first();

    if (message) {
      await message.delete();
      this.emit(SelfRoleManagerEvents.messageDelete, message);
    }
  }

  async #handleUserAction(interaction: ButtonInteraction, user?: null, remove?: null): Promise<void>;
  async #handleUserAction(messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, remove: boolean): Promise<void>;
  async #handleUserAction(userAction: ButtonInteraction | MessageReaction | PartialMessageReaction, user: User | PartialUser, remove = false): Promise<void> {
    const isButtonInteraction = userAction instanceof ButtonInteraction;

    const message = userAction.message;
    if (message.author.id !== this.client.user.id) return;

    const member = await message.guild.members.fetch(isButtonInteraction ? userAction.member.user.id : user.id);
    if (member.user.bot) return;

    const channelOptions = this.channels.get(userAction.message.channelId);
    if (!channelOptions) return;

    const emoji = isButtonInteraction ? userAction.component.emoji : userAction.emoji;
    const rteData = this.#getRTE(userAction, channelOptions, emoji);
    if (!rteData) {
      this.emit(SelfRoleManagerEvents.error, null, 'This emoji cannot be found!');
      return;
    }

    const rolesFromEmojis = channelOptions.rolesToEmojis.map((rte: RoleToEmojiData) => rte.role);
    const rolesFromChannel = [...member.roles.cache.values()].filter((role: Role) => rolesFromEmojis.includes(role.id));
    const maxRolesReach = channelOptions.maxRolesAssigned && rolesFromChannel.length >= channelOptions.maxRolesAssigned;
    const shouldRemoveRole = remove || rolesFromChannel.some((role: RoleResolvable) => role === rteData.role);

    if (isButtonInteraction) {
      this.emit(SelfRoleManagerEvents.interaction, rteData, userAction);
    } else {
      this.emit(shouldRemoveRole ? SelfRoleManagerEvents.reactionRemove : SelfRoleManagerEvents.reactionAdd, rteData, message);
    }

    switch (true) {
      case shouldRemoveRole && rteData.removeOnReact:
        await removeRole(member, rteData.role);
        this.emit(SelfRoleManagerEvents.roleRemove, rteData.role, member);
        break;

      case maxRolesReach:
        this.emit(SelfRoleManagerEvents.maxRolesReach, member, userAction, rolesFromChannel.length, channelOptions.maxRolesAssigned);
        break;

      default:
        await addRole(member, rteData.role);
        this.emit(SelfRoleManagerEvents.roleAdd, rteData.role, member);
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
