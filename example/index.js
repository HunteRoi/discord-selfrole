import { Client } from 'discord.js';
import { SelfRoleManager } from '../lib';

const client = new Client();
const manager = new SelfRoleManager(client, { deleteAfterUnregistration: true, descriptionPrefix: 'This is a prefix!' });

client.on('ready', async () => {
  await manager.registerChannel('CHANNEL_ID', {
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
        sendAsEmbed: true
      },
    },
    maxRolesAssigned: 1,
  });

  console.log('Connected!');

  //await manager.unregisterChannel('CHANNEL_ID');
});

manager.on('channelRegister', (channel, options) => console.log(`Channel ${channel.name} (${channel.id}) has been registered with following options:`, options));
manager.on('channelUnregister', (channel, options) => console.log(`Channel ${channel.name} (${channel.id}) has been unregistered from the following options: `, options));
manager.on('error', (error, message) => console.log(`An error occured: ${error}\n${message}`));
manager.on('messageRetrieve', (message) => console.log(`Message ${message.id} retrieved!`));
manager.on('messageCreate', (message) => console.log(`Message ${message.id} created!`));
manager.on('messageDelete', (message) => console.log(`Message ${message.id} deleted!`));
manager.on('roleRemove', (role, member) => console.log(`Role ${role} removed from ${member.displayName}`));
manager.on('roleAdd', (role, member) => console.log(`Role ${role} given to ${member.displayName}`));
manager.on('reactionAdd', (rte, message) => console.log(`${rte.emoji} added to ${message.id}`));
manager.on('reactionRemove', (rte, message) => console.log(`${rte.emoji} removed from ${message.id}`));
manager.on('maxRolesReach', (member) => console.log(`${member.displayName} has reached the max roles!`));

client.login('TOKEN');
