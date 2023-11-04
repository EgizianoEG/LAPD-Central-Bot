import { Guild } from "discord.js";
import GuildModel from "@Models/Guild.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

/**
 * Updates the database by adding/updating/verifying guild data.
 * @param _
 * @param CreatedGuild
 */
export default async function UpdateDatabase(_: DiscordClient, CreatedGuild: Guild) {
  const GuildExists = await GuildModel.exists({ _id: CreatedGuild.id }).exec();
  if (!GuildExists) {
    await GuildModel.create({
      _id: CreatedGuild.id,
    });

    AppLogger.info({
      message: "A new guild record was added to the database. Id: %d",
      label: "GuildCreate:UpdateDB",
      splat: [CreatedGuild.id],
    });
  }
}
