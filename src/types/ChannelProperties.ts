import type { GuildMember, PartialGuildMember } from "discord.js";
import type { ChannelOptions } from "./ChannelOptions";

/**
 *
 * @export
 * @interface ChannelProperties
 */
export interface ChannelProperties {
    /**
     * The option defined by the user for a channel.
     *
     * @type {ChannelOptions}
     */
    options: ChannelOptions;

    /**
     * The listener for the `GuildMemberUpdate` event.
     *
     * @type {Function}
     */
    rolesChangesListener: (
        oldMember: GuildMember | PartialGuildMember,
        newMember: GuildMember,
    ) => Promise<void>;
}
