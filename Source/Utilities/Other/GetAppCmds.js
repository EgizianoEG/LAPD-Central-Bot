/**
 * Returns the registered application commands
 * @param {DiscordClient} Client
 * @param {String} [GuildId] If provided, returns the application commands registered on it
 */
module.exports = async (Client, GuildId) => {
  let AppCommands;

  if (GuildId) {
    const Guild = await Client.guilds.fetch(GuildId);
    AppCommands = Guild.commands;
    await AppCommands.fetch(GuildId);
  } else {
    AppCommands = Client.application.commands;
    await AppCommands.fetch();
  }

  return AppCommands;
};
