import {
	ButtonInteraction,
	MessageButton,
	Role,
	GuildMember,
} from 'discord.js';

import { isNullOrWhiteSpaces } from '../utils/StringUtils';
import { addRole, removeRole } from '../utils/MemberUtils';
import { SelfRoleManagerEvents } from '../SelfRoleManagerEvents';
import { RoleToEmojiData } from '../types/RoleToEmojiData';
import { SelfRoleManager } from '..';

/**
 * Handles the interaction by granting or removing the related role to the provided guild member.
 *
 * @param manager
 * @param messageReaction
 * @param user
 * @param remove
 * @returns
 */
export const handleInteraction = async (
	manager: SelfRoleManager,
	interaction: ButtonInteraction
) => {
	const message = interaction.message;
	if (message.author.id !== manager.client.user.id) return;

	const member = interaction.member as GuildMember;
	if (member.user.bot) return;

	const channelOptions = manager.channels.get(interaction.channelId);
	if (!channelOptions) return;

	const button = interaction.component as MessageButton;
	const emoji = button.emoji;
	const roleToEmoji: RoleToEmojiData = button.customId
		? channelOptions.rolesToEmojis.find(
				(rte: RoleToEmojiData) =>
					rte.role.toString() === button.customId
		  )
		: isNullOrWhiteSpaces(emoji.id)
		? channelOptions.rolesToEmojis.find(
				(rte: RoleToEmojiData) => rte.emoji == emoji.name
		  )
		: channelOptions.rolesToEmojis.find(
				(rte: RoleToEmojiData) => rte.emoji == emoji.toString()
		  );
	if (!roleToEmoji) {
		manager.emit(
			SelfRoleManagerEvents.error,
			null,
			'This emoji cannot be found!'
		);
		return;
	}

	const channelRoles = channelOptions.rolesToEmojis.map(
		(rte: RoleToEmojiData) => rte.role
	);
	const memberRoles = [...member.roles.cache.values()];
	const rolesFromChannel = memberRoles.filter((role: Role) =>
		channelRoles.includes(role.id)
	);

	const maxRolesReach =
		channelOptions.maxRolesAssigned &&
		rolesFromChannel.length >= channelOptions.maxRolesAssigned;
	const remove = rolesFromChannel.some(
		(role: Role) => role === roleToEmoji.role || role.id == roleToEmoji.role
	);

	manager.emit(SelfRoleManagerEvents.interaction, roleToEmoji, interaction);

	if (remove) {
		const success = await removeRole(member, roleToEmoji.role);
		if (success) {
			manager.emit(
				SelfRoleManagerEvents.roleRemove,
				roleToEmoji.role,
				member,
				interaction
			);
		}
	} else if (!maxRolesReach) {
		const success = await addRole(member, roleToEmoji.role);
		if (success) {
			manager.emit(
				SelfRoleManagerEvents.roleAdd,
				roleToEmoji.role,
				member,
				interaction
			);
		}
	} else {
		manager.emit(
			SelfRoleManagerEvents.maxRolesReach,
			member,
			interaction,
			rolesFromChannel.length,
			channelOptions.maxRolesAssigned
		);
	}
};
