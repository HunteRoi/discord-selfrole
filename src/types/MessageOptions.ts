import type { EmbedData } from "discord.js";

import type { RoleToEmojiData } from "./RoleToEmojiData";

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

    /**
     * The description suffix added to each message.
     *
     * @type {string}
     */
    descriptionSuffix?: string;

    /**
     * The description prefix added to each message.
     *
     * @type {string}
     */
    descriptionPrefix?: string;

    /**
     * A description resolver method for a role-emoji pair.
     *
     * @memberof MessageOptions
     */
    format: (rte: RoleToEmojiData) => string;
}
