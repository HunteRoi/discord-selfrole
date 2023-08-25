import {
  TextChannel,
  Message,
  Role,
  ButtonInteraction,
  GuildMember,
  RoleResolvable
} from 'discord.js';
import type { ChannelOptions, RoleToEmojiData } from './types';
import type { UserAction } from './types/UserAction';

export enum SelfRoleManagerEvents {
  /**
   * Emitted when a channel is registered.
   * @event SelfRoleManager#channelRegister
   * @param {TextChannel} channel The channel reference
   * @param {ChannelOptions} options The channel options
   * @example
   * manager.on(SelfRoleManagerEvents.channelRegister, (channel, options) => {});
   */
  channelRegister = 'channelRegister',
  /**
   * Emitted when a channel is unregistered.
   * @event SelfRoleManager#channelUnregister
   * @param {TextChannel} channel The channel reference
   * @param {ChannelOptions} options The channel options
   * @example
   * manager.on(SelfRoleManagerEvents.channelUnregister, (channel, options) => {});
   */
  channelUnregister = 'channelUnregister',

  /**
   * Emitted when a message is retrieved.
   * @event SelfRoleManager#messageRetrieve
   * @param {Message} message The message
   * @example
   * manager.on(SelfRoleManagerEvents.messageRetrieve, (message) => {});
   */
  messageRetrieve = 'messageRetrieve',
  /**
   * Emitted when a message is created.
   * @event SelfRoleManager#messageCreate
   * @param {Message} message The message
   * @example
   * manager.on(SelfRoleManagerEvents.messageCreate, (message) => {});
   */
  messageCreate = 'messageCreate',
  /**
   * Emitted when a message is deleted.
   * @event SelfRoleManager#messageDelete
   * @param {Message} message The message
   * @example
   * manager.on(SelfRoleManagerEvents.messageDelete, (message) => {});
   */
  messageDelete = 'messageDelete',

  /**
   * Emitted when a role is added.
   * @event SelfRoleManager#roleAdd
   * @param {RoleResolvable} role The role
   * @param {GuildMember} member The guild member
   * @param {UserAction} userAction The user action
   * @example
   * manager.on(SelfRoleManagerEvents.roleAdd, (role, member, userAction) => {});
   */
  roleAdd = 'roleAdd',
  /**
   * Emitted when a role is removed.
   * @event SelfRoleManager#roleRemove
   * @param {RoleResolvable} role The role
   * @param {GuildMember} member The guild member
   * @param {UserAction} userAction The user action
   * @example
   * manager.on(SelfRoleManagerEvents.roleRemove, (role, member, userAction) => {});
   */
  roleRemove = 'roleRemove',

  /**
   * Emitted when a reaction is added.
   * @event SelfRoleManager#reactionAdd
   * @param {RoleToEmojiData} rte The role to emoji data
   * @param {Message} message The message
   * @example
   * manager.on(SelfRoleManagerEvents.reactionAdd, (rte, message) => {});
   */
  reactionAdd = 'reactionAdd',
  /**
   * Emitted when a reaction is removed.
   * @event SelfRoleManager#reactionRemove
   * @param {RoleToEmojiData} rte The role to emoji data
   * @param {Message} message The message
   * @example
   * manager.on(SelfRoleManagerEvents.reactionRemove, (rte, message) => {});
   */
  reactionRemove = 'reactionRemove',
  /**
   * Emitted when an interaction is made.
   * @event SelfRoleManager#interaction
   * @param {RoleToEmojiData} rte The role to emoji data
   * @param {ButtonInteraction} interaction The interaction
   * @example
   * manager.on(SelfRoleManagerEvents.interaction, (rte, interaction) => {});
   */

  interaction = 'interaction',

  /**
   * Emitted when the maximum of roles is reached for the member.
   * @event SelfRoleManager#maxRolesReach
   * @param {GuildMember} member The guild member
   * @param {UserAction} userAction The user action
   * @param {number | null} nbRoles The number of current roles assigned to the user
   * @param {number | null} maximumRoles The maximum roles assignable to the user
   * @example
   * manager.on(SelfRoleManagerEvents.maxRolesReach, (member, userAction, nbRoles, maximumRoles, role) => {});
   */
  maxRolesReach = 'maxRolesReach',
  /**
   * Emitted when the user wants a role but does not have the required roles to apply for it.
   * @event SelfRoleManager#requiredRolesMissing
   * @param {GuildMember} member The guild member
   * @param {UserAction} userAction The user action
   * @param {Role} role The role to add
   * @param {RoleResolvable[]} requiredRoles The required roles to pass the conditions
   * @example
   * manager.on(SelfRoleManagerEvents.requiredRolesMissing, (member, userAction, role, requiredRoles) => {});
   */
  requiredRolesMissing = 'requiredRolesMissing',

  /**
   * Emitted when an error occurs.
   * @event SelfRoleManager#error
   * @param {Error} error The error object
   * @param {string} message The message of the error
   * @param {[Role, GuildMember]} args The possible arguments in case of error when adding/removing a role.
   * @example
   * manager.on(SelfRoleManagerEvents.error, (error, message, args) => {});
   */
  error = 'error',
}
