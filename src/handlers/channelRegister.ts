import { TextChannel, Snowflake } from 'discord.js';

import { SelfRoleManager } from '..';
import { generateMessage } from '../utils/MessageUtils';
import { ChannelOptions } from './../types';

/**
 * Handle the registering of a channel, sending the main message for the automated role-giver system.
 * 
 * @param manager 
 * @param channel 
 * @param options 
 */
export const handleRegistering = async (manager: SelfRoleManager, channel: TextChannel, options: ChannelOptions) => {
  let messages = await channel.messages.fetch({ limit: manager.options.channelsMessagesFetchLimit });

  if (!manager.channels.has(options.channelID)) return;

  messages = messages.filter(msg => msg.author.id === manager.client.user.id);
  let id: Snowflake;
  if (messages && messages.size > 0) {
    const message = messages.first();
    id = message.id;
    manager.emit('messageRetrieve', message);
  }
  else {
    const content = generateMessage(manager, options);
    const message = await channel.send(content);
    id = message.id;
    manager.emit('messageCreate', message);

    const roleToEmojis = await Promise.all(options.rolesToEmojis.map(rte => message.react(rte.emoji).then(msgReaction => rte)));
    roleToEmojis.forEach(rte => manager.emit('reactionAdd', rte, message));
  }
  
  if (manager.channels.has(options.channelID)) {
    manager.channels.set(options.channelID, { ...options, message: { ...options.message, id }});
  }
};
