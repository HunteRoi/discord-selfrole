import { RoleResolvable, EmojiResolvable } from 'discord.js';

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
   * @type {EmojiResolvable}
   */
  emoji: EmojiResolvable;

  /**
   * The role related to the emoji.
   *
   * @type {RoleResolvable}
   */
  role: RoleResolvable;

  /**
   * The name given to the role.
   *
   * @type {string}
   */
  name: string;

  /**
   * A short memo to append to the role-emoji pair.
   *
   * @type {string}
   */
  smallNote?: string;

  /**
   * Whether the role should be removed on reaction or not. Defaults to false.
   *
   * @type {boolean}
   * @memberof RoleToEmojiData
   */
  removeOnReact?: boolean;
}
