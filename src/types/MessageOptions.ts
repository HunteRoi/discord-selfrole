import { EmbedData } from 'discord.js';

/**
 *
 * @export
 * @interface MessageOptions
 */
export interface MessageOptions extends EmbedData {
  /**
   * Whether the message should be sent as an embed or not.
   *
   * @type {boolean}
   */
  sendAsEmbed: boolean;
}
