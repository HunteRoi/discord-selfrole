import {
    type ActionRowBuilder,
    type ButtonBuilder,
    EmbedBuilder,
    type MessageCreateOptions,
} from "discord.js";

import type { ChannelOptions } from "../types/index.js";
import { isNullOrWhiteSpaces } from "./StringUtils.js";

/**
 * Generates a {@link MessageOptions}.
 *
 * @export
 * @param {ChannelOptions} channelOptions The channel options
 * @param {ActionRowBuilder<ButtonBuilder>[]} [actionRowBuilders] The potential action row builder
 * @return {*}  {MessageOptions}
 */
export function constructMessageOptions(
    channelOptions: ChannelOptions,
    actionRowBuilders?: ActionRowBuilder<ButtonBuilder>[],
): MessageCreateOptions {
    const content = generateContent(channelOptions);
    return buildMessage(content, actionRowBuilders);
}

/**
 * Builds the {@link MessageOptions} to send.
 *
 * @param content The message text or embed
 * @param {ActionRowBuilder<ButtonBuilder>[]} [actionRowBuilders] The button to add to the message, if applicable
 * @returns The message to send
 */
function buildMessage(
    content: string | EmbedBuilder,
    actionRowBuilders?: ActionRowBuilder<ButtonBuilder>[],
): MessageCreateOptions {
    return {
        components: actionRowBuilders ? actionRowBuilders : [],
        embeds: content instanceof EmbedBuilder ? [content] : [],
        content: content instanceof EmbedBuilder ? undefined : content,
    };
}

/**
 * Generates the header, description and footer texts then return the generated message or embed.
 *
 * @param {ChannelOptions} channelOptions
 * @returns
 */
function generateContent(
    channelOptions: ChannelOptions,
): EmbedBuilder | string {
    const description = generateDescription(channelOptions);

    if (channelOptions.message.options.sendAsEmbed) {
        return new EmbedBuilder(channelOptions.message.options)
            .setDescription(description)
            .setTimestamp();
    }

    return description;
}

/**
 * Generates the description content.
 *
 * @param {ChannelOptions} channelOptions The options used to build the main content of the description.
 * @param {string} separator Separator used to construct the text. Defaults to '\n'.
 * @returns {string}
 */
function generateDescription(
    channelOptions: ChannelOptions,
    separator = "\n",
): string {
    const stringBuilder: string[] = [];
    const {
        descriptionPrefix: prefix,
        descriptionSuffix: suffix,
        format,
    } = channelOptions.message.options;

    if (!isNullOrWhiteSpaces(prefix)) {
        stringBuilder.push(prefix);
    }

    if (channelOptions.message.options.description) {
        stringBuilder.push(channelOptions.message.options.description);
    }

    for (const rte of channelOptions.rolesToEmojis) {
        stringBuilder.push(format(rte));
    }

    if (!isNullOrWhiteSpaces(suffix)) {
        stringBuilder.push(suffix);
    }

    return stringBuilder.join(separator);
}
