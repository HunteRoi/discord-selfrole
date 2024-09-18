/**
 * The options for the interactions-based self-role manager.
 *
 * @exports
 * @extends SelfRoleOptions
 */
export type InteractionsSelfRoleOptions = SelfRoleOptions & {
    useReactions?: false;
};

/**
 * The options for the reactions-based self-role manager.
 *
 * @export
 * @extends SelfRoleOptions
 */
export type ReactionsSelfRoleOptions = SelfRoleOptions & {
    useReactions: true;
};

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
     * @type {false | true | undefined}
     */
    useReactions?: false | true;
}
