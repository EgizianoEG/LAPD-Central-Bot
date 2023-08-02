const Guild = require("../../Models/Guild.js");
const { CommandInteraction } = require("discord.js");

/**
 * Checks if a given user is already logged in using the bot.
 * @param {CommandInteraction} CmdInteraction
 * @returns {(false|String)} Logged username string if user is already logged in and false if not.
 */
async function IsLoggedIn(CmdInteraction) {
  //
  const InterGuild = await Guild.findOne({ guild_id: CmdInteraction.guildId });
  console.log(InterGuild);
  if (!InterGuild) {
    const GuildMembers = await CmdInteraction.client.guilds.cache
      .find((v) => v.id === CmdInteraction.guildId)
      .members.fetch();
    const NewEntry = await Guild.create({
      guild_id: CmdInteraction.guildId,
      members: [
        {
          user_id: CmdInteraction.user.id,
        },
      ],
    });
  }
  // const NewGuild = await Guild.create({
  //   guild_id: CmdInteraction.guildId,
  //   guild_settings: {
  //     logging_channels: {
  //       citations: "1098161246202765402",
  //       arrests: "1096809341161578650",
  //     },
  //   },
  // });
  // DiscordUser.id
}

module.exports = IsLoggedIn;
