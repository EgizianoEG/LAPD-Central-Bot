/** @type {Utilities.GetAppCommands} */
module.exports = async (Client, GuildId) => {
  if (GuildId) {
    const Guild = await Client.guilds.fetch(GuildId);
    await Guild.commands.fetch();
    // @ts-ignore
    return Guild.commands;
  } else {
    await Client.application.commands.fetch();
    // @ts-ignore
    return Client.application.commands;
  }
};
