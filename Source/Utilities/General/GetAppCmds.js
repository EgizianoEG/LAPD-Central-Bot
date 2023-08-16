// eslint-disable-next-line
const { Client } = require("discord.js");

/**
 * Returns the registered application commands
 * @param {Client} Client
 */
module.exports = async (Client, GuildId) => {
  let AppCommands;

  if (GuildId) {
    const Guild = await Client.guilds.fetch(GuildId);
    AppCommands = Guild.commands;
  } else {
    AppCommands = Client.application.commands;
  }

  await AppCommands.fetch();
  return AppCommands;
};
