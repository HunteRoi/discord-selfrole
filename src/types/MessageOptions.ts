import { MessageEmbedOptions } from 'discord.js';

/**
 *
 * @export
 * @interface MessageOptions
 */
export interface MessageOptions extends MessageEmbedOptions {
	/**
	 * Whether the message should be sent as an embed or not.
	 *
	 * @type {boolean}
	 */
	sendAsEmbed: boolean;
}
