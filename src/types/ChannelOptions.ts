import type { Snowflake } from "discord.js";

import type { MessageOptions } from "./MessageOptions.js";
import type { RoleToEmojiData } from "./RoleToEmojiData.js";
import type { SelectMenuOptions } from "./SelectMenuOptions.js";

/**
 *
 * @export
 * @interface ChannelOptions
 */
export interface ChannelOptions {
    /**
     * The list of role-emoji pairs to add as reactions to the message.
     * A maximum of 25 role-emoji pairs are taken when using Discord components.
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
     * Options for the select menu (and whether to use it or not).
     *
     */
    selectMenu?: SelectMenuOptions;
}
