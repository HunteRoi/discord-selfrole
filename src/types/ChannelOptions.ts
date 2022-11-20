import { Awaitable, GuildMember, PartialGuildMember, Snowflake } from 'discord.js';

import { MessageOptions } from './MessageOptions';
import { RoleToEmojiData } from './RoleToEmojiData';

/**
 *
 * @export
 * @interface ChannelOptions
 */
export interface ChannelOptions {
  /**
   * The list of role-emoji pairs to add as reactions to the message.
   * A maximum of 5 role-emoji pairs are taken when using emoji button components.
   *
   * @type {RoleToEmojiData[]}
   */
  rolesToEmojis: RoleToEmojiData[];

  /**
   * Data about the message.
   *
   */
  message: {
    /**
     * The message id.
     *
     * @type {Snowflake}
     */
    id?: Snowflake;

    /**
     * The content and type of the message sent in the registered channel.
     *
     * @type {MessageOptions}
     */
    options: MessageOptions;
  };

  /**
   * The maximum number of roles which can be assigned to a single user.
   *
   * @type {number}
   */
  maxRolesAssigned?: number;

  /**
   * Private member to store the function for event listener `GuildMemberUpdate`.
   *
   * @private
   * @type {Function}
   */
  readonly _rolesChangesListener: (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => Awaitable<void>;
}
