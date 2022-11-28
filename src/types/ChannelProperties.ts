import { GuildMember, PartialGuildMember } from 'discord.js';
import { ChannelOptions } from './ChannelOptions';

/**
 *
 * @export
 * @interface ChannelProperties
 */
export interface ChannelProperties {
  /**
   * The option defined by the user for a channel.
   *
   * @type {ChannelOptions}
   */
  options: ChannelOptions;

   /**
   * function for event listener `GuildMemberUpdate`.
   *
   * @type {Function}
   */
  _rolesChangesListener: (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => Promise<void>;
}
