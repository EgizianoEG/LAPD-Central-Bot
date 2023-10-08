import { Guild } from "discord.js";
import GuildModel from "@Models/Guild.js";

/**
 * Updates the database by adding/updating/verifying guild data.
 * @param _
 * @param CreatedGuild
 */
export default async function UpdateDatabase(_: DiscordClient, CreatedGuild: Guild) {
  const GuildExists = await GuildModel.exists({ _id: CreatedGuild.id }).exec();
  if (!GuildExists) {
    GuildModel.create({
      _id: CreatedGuild.id,
    });
  }
}
