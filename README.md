<a href="https://www.npmjs.com/package/@hunteroi/discord-selfrole"><img src="https://badge.fury.io/js/%40hunteroi%2Fdiscord-selfrole.svg" alt="npm version" height="18"></a>

# Discord SelfRole
Discord SelfRole is a framework to easily create a channel with automated role-giver system.

- Supports custom emojis
- Emits events like `channelRegister`, `roleAdd`, `reactionRemove` and **8 more**!
- Allow full customization of the embed (you can add image, thumbnail, etc.)
- And much more!

## Installation

```sh
npm install --save @hunteroi/discord-selfrole
```

## Examples
See [./example/index.js](example/index.js).

![IMAGE](assets/example.gif)

## Events
```ts
manager.on('channelRegister', (channel, options) => {});

manager.on('channelUnregister', (channel, options) => {});

manager.on('error', (error, message) => {}));

manager.on('messageRetrieve', (message) => {});

manager.on('messageCreate', (message) => {});

manager.on('messageDelete', (message) => {});

manager.on('roleRemove', (role, member) => {});

manager.on('roleAdd', (role, member) => {});

manager.on('reactionAdd', (rte, message) => {});

manager.on('reactionRemove', (rte, message) => {});

manager.on('maxRolesReach', (member) => {});
```

## Contribution
Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project
2. Create your Branch: `git checkout -b patch/YourAmazingWork`
3. Commit your Changes: `git commit -m 'Add some amazing work'`
4. Push to the Branch: `git push origin patch/YourAmazingWork`
5. Open a Pull Request
