import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageOptions,
  Role,
  Snowflake,
  TextChannel
} from 'discord.js';

import { SelfRoleManager, SelfRoleManagerEvents } from '..';
import { generateMessage } from '../utils/MessageUtils';
import { ChannelOptions, RoleToEmojiData } from '../types';

/**
 * Handle the registering of a channel, sending the main message for the automated role-giver system.
 *
 * @param manager
 * @param channel
 * @param options
 */
export const handleRegistering = async (
  manager: SelfRoleManager,
  channel: TextChannel,
  options: ChannelOptions
) => {
  let messages = await channel.messages.fetch({
    limit: manager.options.channelsMessagesFetchLimit,
  });

  if (!manager.channels.has(options.channelID)) return;

  messages = messages.filter(
    (msg: Message) =>
      msg.author.id === manager.client.user.id &&
      (manager.options.useReactions
        ? msg.reactions.cache.size > 0
        : msg.reactions.cache.size === 0)
  );
  let id: Snowflake;
  if (messages && messages.size > 0) {
    const message = messages.first();
    id = message.id;
    manager.emit(SelfRoleManagerEvents.messageRetrieve, message);
  } else {
    let actionRowBuilder: ActionRowBuilder<ButtonBuilder>;
    const content = generateMessage(manager, options);

    if (!manager.options.useReactions) {
      actionRowBuilder = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...options.rolesToEmojis
          .slice(0, 5) // a maximum of 5 buttons can be created per action row
          .map((rte: RoleToEmojiData) =>
            new ButtonBuilder()
              .setEmoji(rte.emoji)
              .setCustomId(rte.role instanceof Role ? rte.role.id : rte.role)
              .setStyle(ButtonStyle.Secondary)
          )
      );
    }

    const messageToSend: MessageOptions = {};

    if (actionRowBuilder) {
      messageToSend.components = [actionRowBuilder];
    }

    if (content instanceof EmbedBuilder) {
      messageToSend.embeds = [content];
    } else {
      messageToSend.content = content;
    }

    const message = await channel.send(messageToSend);
    id = message.id;
    manager.emit(SelfRoleManagerEvents.messageCreate, message);
    if (manager.options.useReactions) {
      await Promise.all(
        options.rolesToEmojis.map((rte) =>
          message.react(rte.emoji).then(() => rte)
        )
      );
    }
  }

  if (manager.channels.has(options.channelID)) {
    manager.channels.set(options.channelID, {
      ...options,
      message: { ...options.message, id },
    });
  }
};
