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
     * The maximum channel's messages to fetch.
     *
     * @type {number}
     */
    channelsMessagesFetchLimit: number;

    /**
     * Whether the manager should be based on reactions or interactions.
     *
     * @type {boolean}
     */
    useReactions?: boolean;
}
