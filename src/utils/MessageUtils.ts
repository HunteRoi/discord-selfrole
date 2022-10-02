import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageOptions } from 'discord.js';

import { isNullOrWhiteSpaces } from './StringUtils';
import { ChannelOptions, RoleToEmojiData } from '../types';

/**
 * Generates a {@link MessageOptions}.
 *
 * @export
 * @param {ChannelOptions} channelOptions The channel options
 * @param {string[]} [descriptionPrefix, descriptionSuffix] An array of two descriptions: the prefix and suffix.
 * @param {ActionRowBuilder<ButtonBuilder>} [actionRowBuilder] The potential action row builder
 * @return {*}  {MessageOptions}
 */
export function constructMessageOptions(channelOptions: ChannelOptions, [descriptionPrefix, descriptionSuffix]: string[], actionRowBuilder?: ActionRowBuilder<ButtonBuilder>): MessageOptions {
  const content = generateContent(channelOptions, descriptionPrefix, descriptionSuffix);
  return buildMessage(content, actionRowBuilder);
}

/**
   * Builds the {@link MessageOptions} to send.
   *
   * @param content The message text or embed
   * @param actionRowBuilder The button to add to the message, if applicable
   * @returns The message to send
   */
function buildMessage(content: string | EmbedBuilder, actionRowBuilder?: ActionRowBuilder<ButtonBuilder>): MessageOptions {
  return {
    components: actionRowBuilder ? [actionRowBuilder] : [],
    embeds: (content instanceof EmbedBuilder ? [content] : []),
    content: (content instanceof EmbedBuilder ? undefined : content)
  };
}

/**
 * Generates the header, description and footer texts then return the generated message or embed.
 *
 * @param {ChannelOptions} channelOptions
 * @returns
 */
function generateContent(channelOptions: ChannelOptions, descriptionPrefix?: string, descriptionSuffix?: string): EmbedBuilder | string {
  const description = generateDescription(
    channelOptions,
    descriptionPrefix,
    descriptionSuffix
  );

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
 * @param {string} [prefix] The text appended at the beginning of the description.
 * @param {string} [suffix] The text appended at the end of the description.
 * @param {string} separator Separator used to construct the text. Defaults to '\n'.
 * @returns {string}
 */
function generateDescription(channelOptions: ChannelOptions, prefix?: string, suffix?: string, separator: string = '\n'): string {
  const stringBuilder: string[] = [];

  if (!isNullOrWhiteSpaces(prefix)) {
    stringBuilder.push(prefix);
  }

  stringBuilder.push(channelOptions.message.options.description);
  channelOptions.rolesToEmojis.forEach((rte: RoleToEmojiData) =>
    stringBuilder.push(channelOptions.format(rte))
  );

  if (!isNullOrWhiteSpaces(suffix)) {
    stringBuilder.push(suffix);
  }

  return stringBuilder.join(separator);
}
