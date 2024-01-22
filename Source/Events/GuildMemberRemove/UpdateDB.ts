import { GuildMember } from "discord.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param _
 * @param Member
 */
export default async function UpdateDatabase(_: DiscordClient, Member: GuildMember) {
  const ShiftActive = await GetShiftActive({
    Interaction: { user: { id: Member.id }, guildId: Member.guild.id },
    UserOnly: true,
  }).catch(() => null);

  if (ShiftActive) {
    try {
      await ShiftActive.end(new Date());
      await ShiftActionLogger.LogShiftAutomatedEnd(
        ShiftActive,
        Member,
        "User has left the server."
      );
    } catch (Err: any) {
      AppLogger.error({
        label: "Events:GuildMemberRemove",
        message: "Failed to end shift upon user leaving a server.",
        stack: Err.stack,
      });
    }
  }
}
