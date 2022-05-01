const { Client, Intents, Role } = require('discord.js');
const { SelfRoleManager } = require('../lib');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_INTEGRATIONS,
  ],
});
const manager = new SelfRoleManager(client, {
  deleteAfterUnregistration: true,
  descriptionPrefix: 'This is a prefix!',
  useReactions: true,
});

client.on('ready', async () => {
  await manager.registerChannel('CHANNEL_ID', {
    format: (rte) =>
      `${rte.emoji} - ${rte.role instanceof Role ? rte.role : rte.name}${
        !isNullOrWhiteSpaces(rte.smallNote) ? ` (${rte.smallNote})` : ''
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

  //await manager.unregisterChannel('CHANNEL_ID');
});

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
manager.on('roleRemove', async (role, member, interaction) => {
  console.log(`Role ${role} removed from ${member.displayName}`);
  await interaction.editReply({
    content: `The new role ${role} has been added to you.`,
  });
});
manager.on('roleAdd', async (role, member, interaction) => {
  console.log(`Role ${role} given to ${member.displayName}`);
  await interaction.editReply({
    content: `Your old role ${role} has been removed from you.`,
  });
});
manager.on('reactionAdd', (rte, message) =>
  console.log(`${rte.emoji} added to ${message.id}`)
);
manager.on('reactionRemove', (rte, message) =>
  console.log(`${rte.emoji} removed from ${message.id}`)
);
manager.on('maxRolesReach', async (member, interaction, nbRoles, maxRoles) => {
  console.log(
    `${member.displayName} has reached or exceeded the max roles (${nbRoles}/${maxRoles})!`
  );
  await interaction.editReply({
    content: `You reached or exceed the maximum number of roles (${nbRoles}/${maxRoles})!`,
  });
});
manager.on('interaction', (rte, interaction) =>
  console.log(
    `An interaction has been made by ${interaction.member.displayName}`
  )
);

client.login('TOKEN');
