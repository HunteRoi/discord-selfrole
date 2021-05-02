import { GuildMember, MessageReaction, PartialUser, User, RoleResolvable } from 'discord.js';

import { SelfRoleManager } from '..';
import { RoleToEmojiData } from '../types';
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
export const handleReaction = async (manager: SelfRoleManager, messageReaction: MessageReaction, user: User | PartialUser, remove = false) => {
  const message = messageReaction.message;
  if (message.author.id !== manager.client.user.id) return;

  const member = await message.guild.members.fetch(user.id);
  if (member.user.bot) return;

  const channelOptions = manager.channels.get(message.channel.id);
  if (!channelOptions) return;

  const emoji = messageReaction.emoji;
  const roleToEmoji: RoleToEmojiData = isNullOrWhiteSpaces(emoji.id) 
    ? channelOptions.rolesToEmojis.find(rte => rte.emoji == emoji.name)
    : channelOptions.rolesToEmojis.find(rte => rte.emoji == emoji.toString());

  if (!roleToEmoji) {
    manager.emit('error', null, 'This emoji cannot be found!');
    return;
  }

  const channelRoles = channelOptions.rolesToEmojis.map(rte => rte.role);
  const memberRoles = member.roles.cache.array();
  const nbRolesFromChannel = memberRoles.filter(role => channelRoles.includes(role.id)).length;
  const maxRolesReach = channelOptions.maxRolesAssigned && nbRolesFromChannel >= channelOptions.maxRolesAssigned;
  
  if (remove) manager.emit('reactionRemove', roleToEmoji, message);
  else manager.emit('reactionAdd', roleToEmoji, message);

  if (remove ? !roleToEmoji.removeOnReact : roleToEmoji.removeOnReact) {
    removeRole(member, roleToEmoji.role, manager);
  } else if (!maxRolesReach) {
    addRole(member, roleToEmoji.role, manager);
  } else {
    manager.emit('maxRolesReach', member);
  }
};

/**
 * Remove a role from a guild member.
 *
 * @param {GuildMember} member
 * @param {RoleResolvable} role
 * @param {SelfRoleManager} manager
 */
function removeRole(member: GuildMember, role: RoleResolvable, manager: SelfRoleManager) {
  if (member.roles.cache.has(role.toString())) {
    member.roles.remove(role);
    manager.emit('roleRemove', role, member);
  }
}

/**
 * Add a role to a guild member.
 *
 * @param {GuildMember} member
 * @param {RoleResolvable} role
 * @param {SelfRoleManager} manager
 */
function addRole(member: GuildMember, role: RoleResolvable, manager: SelfRoleManager) {
  if (!member.roles.cache.has(role.toString())) {
    member.roles.add(role);
    manager.emit('roleAdd', role, member);
  }
}
