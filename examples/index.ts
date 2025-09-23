import { ButtonInteraction, ButtonStyle, Client, IntentsBitField, MessageFlags, Role, roleMention, StringSelectMenuInteraction } from 'discord.js';

import { InteractionsSelfRoleManager } from '../lib/index.js';

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});
const manager = new InteractionsSelfRoleManager(client, {
  deleteAfterUnregistration: true,
  channelsMessagesFetchLimit: 3
});

client.on('clientReady', async () => {
  await manager.registerChannel('CHANNEL_ID', {
    rolesToEmojis: [
      {
        emoji: '1️⃣',
        role: 'ROLE_ID',
      },
      {
        emoji: '2️⃣',
        role: 'ROLE_ID',
      },
      {
        emoji: '3️⃣',
        role: 'ROLE_ID',
      },
      {
        emoji: '<:EMOJI_NAME:EMOJI_ID>',
        role: 'ROLE_ID',
        requiredRoles: ['OTHER_ROLE_ID'],
        smallNote: 'check for required roles first'
      },
      {
        emoji: '4⃣',
        role: 'ROLE_ID',
      },
      {
        emoji: '5⃣',
        role: 'ROLE_ID',
      },
      {
        emoji: '6⃣',
        role: 'ROLE_ID',
      },
    ],
    message: {
      options: {
        descriptionPrefix: 'This is a prefix!',
        sendAsEmbed: true,
        format: (rte) => {
          return `${rte.emoji} - ${rte.role instanceof Role ? rte.role : roleMention(rte.role)}${rte.smallNote ? ` (${rte.smallNote})` : ''}`;
        },
      },
    },
    maxRolesAssigned: 4,
    selectMenu: {
      minValues: 1,
      maxValues: 25,
      placeholder: 'Select your new roles!!',
      resetButton: {
        label: 'Remove all roles',
        style: ButtonStyle.Secondary,
        emoji: '🗑️',
      },
    }
  });

  console.log('Connected!');
});

client.on(
  'messageCreate',
  async (message) => {
    if (message.cleanContent === 'unregisterChannel')
      await manager.unregisterChannel('CHANNEL_ID');
  }
);

manager.on('channelRegister', (channel, options) =>
  console.log(
    `Channel ${channel.name} (${channel.id}) has been registered with following options:`,
    options,
  ),
);
manager.on('channelUnregister', (channel, options) =>
  console.log(
    `Channel ${channel.name} (${channel.id}) has been unregistered from the following options: `,
    options,
  ),
);
manager.on('error', (error, message) =>
  console.log(`An error occured: ${error}\n${message}`),
);
manager.on('messageRetrieve', (message) =>
  console.log(`Message ${message.id} retrieved!`),
);
manager.on('messageCreate', (message) =>
  console.log(`Message ${message.id} created!`),
);
manager.on('messageDelete', (message) =>
  console.log(`Message ${message.id} deleted!`),
);
manager.on('interaction', async (_rte, interaction) => {
  console.log(`An interaction has been made by ${interaction.member.displayName}!`);
  interaction.isButton() && await interaction.editReply("You interacted with a button!");
  interaction.isStringSelectMenu() && await interaction.editReply("You interacted with a menu!");
});
manager.on('roleRemove', async (role, member, userAction) => {
  console.log(`Role ${role.name} ${userAction ? '' : 'automatically '}removed from ${member.displayName}`);

  if (userAction instanceof ButtonInteraction || userAction instanceof StringSelectMenuInteraction) {
    userAction.followUp && await userAction.followUp({
      content: `Your old role ${role} has been removed from you.`,
      flags: MessageFlags.Ephemeral
    });
  }
});
manager.on('roleAdd', async (role, member, userAction) => {
  console.log(`Role ${role.name} given to ${member.displayName}`);

  if (userAction instanceof ButtonInteraction || userAction instanceof StringSelectMenuInteraction) {
    await userAction.followUp({
      content: `The new role ${role} has been added to you.`,
      flags: MessageFlags.Ephemeral
    });
  }
});
manager.on(
  'maxRolesReach',
  async (member, userAction, nbRoles, maxRoles, role) => {
    console.log(`${member.displayName} has reached or exceeded the max roles (${nbRoles}/${maxRoles})! Role ${role.name} cannot be given.`);

    if (userAction instanceof ButtonInteraction || userAction instanceof StringSelectMenuInteraction) {
      await userAction.followUp({
        content: `You reached or exceed the maximum number of roles (${nbRoles}/${maxRoles})! You cannot get ${role}.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
);
manager.on(
  'requiredRolesMissing',
  async (member, userAction, role, dependencies) => {
    console.log(`${member.displayName} doesn't have the required roles to get the role ${role.name}!`, dependencies);

    if (userAction instanceof ButtonInteraction || userAction instanceof StringSelectMenuInteraction) {
      await userAction.followUp({
        content: `You don't have the required roles to get the role ${role}!`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
);

client.login('TOKEN');
