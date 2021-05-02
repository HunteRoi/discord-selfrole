/**
 *
 * @export
 * @interface SelfRoleOptions
 */
export interface SelfRoleOptions {
  /**
   * Whether or not the message of a channel should be deleted when the channel is unregistered
   *
   * @type {boolean}
   */
  deleteAfterUnregistration: boolean;

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
   * The maximum channel's messages to fetch.
   *
   * @type {number}
   */
  channelsMessagesFetchLimit: number;
}