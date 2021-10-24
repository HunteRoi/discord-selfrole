import { MessageEmbed, Role } from 'discord.js';

import { SelfRoleManager } from '..';
import { isNullOrWhiteSpaces } from './StringUtils';
import { ChannelOptions } from '../types';

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
): MessageEmbed | string {
	const description = generateDescription(
		channelOptions,
		manager.options.descriptionPrefix,
		manager.options.descriptionSuffix
	);

	if (channelOptions.message.options.sendAsEmbed) {
		const embed = new MessageEmbed(channelOptions.message.options)
			.setDescription(description)
			.setTimestamp();

		return embed;
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
	channelOptions.rolesToEmojis.forEach((rte) =>
		stringBuilder.push(
			`${rte.emoji} - ${rte.role instanceof Role ? rte.role : rte.name}${
				!isNullOrWhiteSpaces(rte.smallNote) ? ` (${rte.smallNote})` : ''
			}`.trim()
		)
	);

	if (!isNullOrWhiteSpaces(suffix)) {
		stringBuilder.push(suffix);
	}

	return stringBuilder.join(separator);
}
