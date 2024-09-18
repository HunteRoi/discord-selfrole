import type { EmojiIdentifierResolvable, RoleResolvable } from "discord.js";

/**
 * A mapping class to link a role and an emoji altogether.
 *
 * @export
 * @interface RoleToEmojiData
 */
export interface RoleToEmojiData {
    /**
     * The emoji linked to the role.
     *
     * @type {EmojiIdentifierResolvable}
     */
    emoji: EmojiIdentifierResolvable;

    /**
     * The role related to the emoji.
     *
     * @type {RoleResolvable}
     */
    role: RoleResolvable;

    /**
     * A short memo to append to the role-emoji pair.
     *
     * @type {string}
     */
    smallNote?: string;

    /**
     * Whether the role should be removed on reaction or not. Defaults to false.
     * Ignored if using interactions.
     *
     * @type {boolean}
     * @memberof RoleToEmojiData
     * @deprecated
     */
    removeOnReact?: boolean;

    /**
     * List of required roles to be able to react to this role.
     *
     * @type {RoleResolvable[]}
     * @memberof RoleToEmojiData
     */
    requiredRoles?: RoleResolvable[];
}
