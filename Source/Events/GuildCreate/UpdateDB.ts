import { Discord } from "@Config/Secrets.js";
import { Guild } from "discord.js";
import GuildModel from "@Models/Guild.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

/**
 * Updates the database by adding/updating/verifying guild data.
 * @param _
 * @param CreatedGuild
 */
export default async function UpdateDatabase(_: DiscordClient, GuildInst: Guild) {
  if (
    Discord.WLGuilds &&
    !Discord.WLGuilds.includes(GuildInst.id) &&
    Discord.TestGuildId !== GuildInst.id
  ) {
    await GuildInst.leave();
    return;
  }

  const GuildExists = await GuildModel.exists({ _id: GuildInst.id }).exec();
  if (!GuildExists) {
    await GuildModel.create({
      _id: GuildInst.id,
    });

    AppLogger.info({
      message: "A new guild record was added to the database. Id: %o",
      label: "Events:GuildCreate:UpdateDB",
      splat: [GuildInst.id],
    });
  }
}
