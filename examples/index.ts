import { ButtonInteraction, Client, IntentsBitField, Role, roleMention } from 'discord.js';

import { SelfRoleManager } from '../lib/index.js';

const client = new Client({
  intents: [
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
  ],
});
const manager = new SelfRoleManager(client, {
  deleteAfterUnregistration: true,
  useReactions: false,
  channelsMessagesFetchLimit: 3
});

client.on('ready', async () => {
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
        removeOnReact: true,
        smallNote: 'removes on reaction',
      },
      {
        emoji: '<:EMOJI_NAME:EMOJI_ID>',
        role: 'ROLE_ID',
        requiredRoles: ['OTHER_ROLE_ID'],
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
manager.on('roleRemove', async (role, member, userAction) => {
  console.log(
    `Role ${role} ${userAction ? '' : 'automatically '}removed from ${member.displayName}`,
  );
  userAction &&
    userAction instanceof ButtonInteraction &&
    (await userAction.editReply({
      content: `Your old role ${role.name} has been removed from you.`,
    }));
});
manager.on('roleAdd', async (role, member, userAction) => {
  console.log(`Role ${role} given to ${member.displayName}`);
  userAction instanceof ButtonInteraction &&
    (await userAction.editReply({
      content: `The new role ${role.name} has been added to you.`,
    }));
});
manager.on('reactionAdd', (rte, message) =>
  console.log(`${rte.emoji} added to ${message.id}`),
);
manager.on('reactionRemove', (rte, message) =>
  console.log(`${rte.emoji} removed from ${message.id}`),
);
manager.on(
  'maxRolesReach',
  async (member, userAction, nbRoles, maxRoles, role) => {
    console.log(
      `${member.displayName} has reached or exceeded the max roles (${nbRoles}/${maxRoles})!`,
    );
    userAction instanceof ButtonInteraction &&
      (await userAction.editReply({
        content: `You reached or exceed the maximum number of roles (${nbRoles}/${maxRoles})! You cannot get ${role.name}.`,
      }));
  },
);
manager.on('interaction', (rte, interaction) =>
  console.log(
    `An interaction has been made by ${interaction.member.displayName}`,
  ),
);
manager.on(
  'requiredRolesMissing',
  async (member, userAction, role, dependencies) => {
    console.log(
      `${member.displayName} doesn't have the required roles to get the role ${role.name}!`,
      dependencies,
    );
    userAction instanceof ButtonInteraction &&
      (await userAction.editReply({
        content: `${member.displayName} doesn't have the required roles to get the role ${role.name}!`,
      }));
  },
);

client.login('TOKEN');
