import { EmbedBuilder } from 'discord.js';

import { SelfRoleManager } from '..';
import { isNullOrWhiteSpaces } from './StringUtils';
import { ChannelOptions, RoleToEmojiData } from '../types';

/**
 * Generates the header, description and footer texts then return the generated message or embed.
 *
 * @export
 * @param {SelfRoleManager} manager
 * @param {ChannelOptions} channelOptions
 * @returns
 */
export function generateMessage(
  manager: SelfRoleManager,
  channelOptions: ChannelOptions
): EmbedBuilder | string {
  const description = generateDescription(
    channelOptions,
    manager.options.descriptionPrefix,
    manager.options.descriptionSuffix
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
 * @export
 * @param {ChannelOptions} channelOptions The options used to build the main content of the description.
 * @param {string} [prefix] The text appended at the beginning of the description.
 * @param {string} [suffix] The text appended at the end of the description.
 * @param {string} separator Separator used to construct the text. Defaults to '\n'.
 * @returns {string}
 */
export function generateDescription(
  channelOptions: ChannelOptions,
  prefix?: string,
  suffix?: string,
  separator = '\n'
): string {
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
