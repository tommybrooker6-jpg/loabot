require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const interactionCreate = require('./handlers/interactionCreate');
const guildMemberUpdate = require('./handlers/guildMemberUpdate');
const { startLoaExpiryCheck } = require('./utils/scheduler');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data) client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  startLoaExpiryCheck(client);
});

client.on('interactionCreate', (interaction) => interactionCreate(interaction, client));
client.on('guildMemberUpdate', guildMemberUpdate);

client.login(process.env.DISCORD_TOKEN);
