import { TextChannel, Collection, Message } from 'discord.js';

import { SelfRoleManager, SelfRoleManagerEvents } from '..';
import { ChannelOptions } from '../types';

/**
 * Handle the unregistering of a channel, deleting the main message inside.
 *
 * @param manager
 * @param channel
 * @param options
 */
export const handleUnregistering = async (
  manager: SelfRoleManager,
  channel: TextChannel,
  options: ChannelOptions
) => {
  const messages = await channel.messages.fetch(options.message.id);

  let message: Message;
  if (messages instanceof Collection) {
    message = messages.first();
  } else if (messages instanceof Message) message = messages;

  if (message) {
    message.delete();
    manager.emit(SelfRoleManagerEvents.messageDelete, message);
  }
};
