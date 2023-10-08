import { GuildMember } from "discord.js";
import ProfileModel from "@Models/GuildProfile.js";

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param _
 * @param Member
 */
export default async function (_: DiscordClient, Member: GuildMember) {
  return ProfileModel.deleteOne({ _id: Member.id, guild: Member.guild.id }).exec();
}
