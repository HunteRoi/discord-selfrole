import { GuildMember, Role, RoleResolvable } from 'discord.js';

/**
 * Remove a role from a guild member.
 *
 * @param {GuildMember} member
 * @param {RoleResolvable} role
 */
async function removeRole(
  member: GuildMember,
  role: RoleResolvable
): Promise<GuildMember | null> {
  const roleId = role instanceof Role ? role.id : role;
  if (member.roles.cache.has(roleId)) return member.roles.remove(role);
  return null;
}

/**
 * Add a role to a guild member.
 *
 * @param {GuildMember} member
 * @param {RoleResolvable} role
 */
async function addRole(
  member: GuildMember,
  role: RoleResolvable
): Promise<GuildMember | null> {
  const roleId = role instanceof Role ? role.id : role;
  if (!member.roles.cache.has(roleId)) return member.roles.add(role);
  return null;
}

export { removeRole, addRole };
