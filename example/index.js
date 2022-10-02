const { Client, Role, IntentsBitField, ButtonInteraction } = require('discord.js');
const { SelfRoleManager } = require('../lib');
const { isNullOrWhiteSpaces } = require('../lib/utils/StringUtils');

const client = new Client({
  intents: [
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildIntegrations,
  ],
});
const manager = new SelfRoleManager(client, {
  deleteAfterUnregistration: true,
  descriptionPrefix: 'This is a prefix!',
  useReactions: false,
});

client.on('ready', async () => {
  await manager.registerChannel('CHANNEL_ID', {
    format: (rte) =>
      `${rte.emoji} - ${rte.role instanceof Role ? rte.role : rte.name}${!isNullOrWhiteSpaces(rte.smallNote) ? ` (${rte.smallNote})` : ''
      }`,
    rolesToEmojis: [
      {
        emoji: '1️⃣',
        role: 'ROLE_ID',
        name: 'one',
      },
      {
        emoji: '2️⃣',
        role: 'ROLE_ID',
        name: 'two',
      },
      {
        emoji: '3️⃣',
        role: 'ROLE_ID',
        name: 'three',
        removeOnReact: true,
        smallNote: 'removes on reaction'
      },
    ],
    message: {
      options: {
        sendAsEmbed: true,
      },
    },
    maxRolesAssigned: 1,
  });

  console.log('Connected!');
});

client.on('messageCreate', async (message) => message.cleanContent === 'unregisterChannel' && await manager.unregisterChannel('CHANNEL_ID'));

manager.on('channelRegister', (channel, options) =>
  console.log(
    `Channel ${channel.name} (${channel.id}) has been registered with following options:`,
    options
  )
);
manager.on('channelUnregister', (channel, options) =>
  console.log(
    `Channel ${channel.name} (${channel.id}) has been unregistered from the following options: `,
    options
  )
);
manager.on('error', (error, message) =>
  console.log(`An error occured: ${error}\n${message}`)
);
manager.on('messageRetrieve', (message) =>
  console.log(`Message ${message.id} retrieved!`)
);
manager.on('messageCreate', (message) =>
  console.log(`Message ${message.id} created!`)
);
manager.on('messageDelete', (message) =>
  console.log(`Message ${message.id} deleted!`)
);
manager.on('roleRemove', async (role, member, userAction) => {
  console.log(`Role ${role} removed from ${member.displayName}`);
  userAction instanceof ButtonInteraction && await userAction.editReply({
    content: `Your old role ${role} has been removed from you.`,
  });
});
manager.on('roleAdd', async (role, member, userAction) => {
  console.log(`Role ${role} given to ${member.displayName}`);
  userAction instanceof ButtonInteraction && await userAction.editReply({
    content: `The new role ${role} has been added to you.`,
  });
});
manager.on('reactionAdd', (rte, message) =>
  console.log(`${rte.emoji} added to ${message.id}`)
);
manager.on('reactionRemove', (rte, message) =>
  console.log(`${rte.emoji} removed from ${message.id}`)
);
manager.on('maxRolesReach', async (member, userAction, nbRoles, maxRoles) => {
  console.log(
    `${member.displayName} has reached or exceeded the max roles (${nbRoles}/${maxRoles})!`
  );
  userAction instanceof ButtonInteraction && await userAction.editReply({
    content: `You reached or exceed the maximum number of roles (${nbRoles}/${maxRoles})!`,
  });
});
manager.on('interaction', (rte, interaction) =>
  console.log(`An interaction has been made by ${interaction.member.displayName}`)
);

client.login('TOKEN');
