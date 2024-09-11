import { Client, type ClientOptions } from "discord.js";

import { InteractionsSelfRoleManager } from "./InteractionsSelfRoleManager.js";
import { ReactionsSelfRoleManager } from "./ReactionsSelfRoleManager.js";
import type { SelfRoleManager } from "./SelfRoleManager.js";
import type {
    InteractionsSelfRoleOptions,
    ReactionsSelfRoleOptions,
    SelfRoleOptions,
} from "./types/index.js";

/**
 * A wrapper of {@link Client} that provides a support for the SelfRoleManager.
 * @export
 * @class ClientWithSelfRoleManager
 * @extends {Client}
 * @deprecated Use {@link InteractionsSelfRoleManager} instead.
 */
export class ClientWithSelfRoleManager extends Client {
    /**
     * An instance of {@link SelfRoleManager} that currently manages all the channels which have automated role-react messages for the client.
     *
     * @name ClientWithSelfRoleManager#selfRoleManager
     * @type {SelfRoleManager}
     */
    public readonly selfRoleManager: SelfRoleManager;

    /**
     * Creates an instance of ClientWithSelfRoleManager.
     * @param {ClientOptions} [options] Options for the client
     * @param {SelfRoleOptions} [selfRoleOptions={
     *     deleteAfterUnregistration: false
     *     channelsMessagesFetchLimit: 3,
     *     useReactions: false
     *   }]
     */
    constructor(
        options: ClientOptions,
        selfRoleOptions: SelfRoleOptions = {
            deleteAfterUnregistration: false,
            channelsMessagesFetchLimit: 3,
        },
        useReactions = false,
    ) {
        super(options);

        this.selfRoleManager = useReactions
            ? new ReactionsSelfRoleManager(this, {
                  ...selfRoleOptions,
                  useReactions,
              } as ReactionsSelfRoleOptions)
            : new InteractionsSelfRoleManager(this, {
                  ...selfRoleOptions,
                  useReactions,
              } as InteractionsSelfRoleOptions);
    }
}
