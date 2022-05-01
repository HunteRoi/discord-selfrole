import {
  MessageReaction,
  PartialUser,
  User,
  PartialMessageReaction,
  Role,
} from 'discord.js';

import { SelfRoleManager, SelfRoleManagerEvents } from '..';
import { RoleToEmojiData } from '../types';
import { addRole, removeRole } from '../utils/MemberUtils';
import { isNullOrWhiteSpaces } from '../utils/StringUtils';

/**
 * Handles the reaction addition/removal by granting or removing the related role to the provided guild member.
 *
 * @param manager
 * @param messageReaction
 * @param user
 * @param remove
 * @returns
 */
export const handleReaction = async (
  manager: SelfRoleManager,
  messageReaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  remove = false
) => {
  const message = messageReaction.message;
  if (message.author.id !== manager.client.user.id) return;

  const member = await message.guild.members.fetch(user.id);
  if (member.user.bot) return;

  const channelOptions = manager.channels.get(message.channel.id);
  if (!channelOptions) return;

  const emoji = messageReaction.emoji;
  const roleToEmoji: RoleToEmojiData = isNullOrWhiteSpaces(emoji.id)
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
  const nbRolesFromChannel = memberRoles.filter((role: Role) =>
    channelRoles.includes(role.id)
  ).length;
  const maxRolesReach =
    channelOptions.maxRolesAssigned &&
    nbRolesFromChannel >= channelOptions.maxRolesAssigned;

  manager.emit(
    remove
      ? SelfRoleManagerEvents.reactionRemove
      : SelfRoleManagerEvents.reactionAdd,
    roleToEmoji,
    message
  );

  if (remove ? !roleToEmoji.removeOnReact : roleToEmoji.removeOnReact) {
    const success = await removeRole(member, roleToEmoji.role);
    if (success)
      manager.emit(SelfRoleManagerEvents.roleRemove, roleToEmoji.role, member);
  } else if (!maxRolesReach) {
    const success = await addRole(member, roleToEmoji.role);
    if (success)
      manager.emit(SelfRoleManagerEvents.roleAdd, roleToEmoji.role, member);
  } else {
    manager.emit(SelfRoleManagerEvents.maxRolesReach, member);
  }
};
