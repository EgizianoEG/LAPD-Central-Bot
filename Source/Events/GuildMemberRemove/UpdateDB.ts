import { GuildMember } from "discord.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param _ - Unused parameter, included for compatibility.
 * @param Member - The guild member who left the server.
 */
export default async function UpdateDatabase(_: DiscordClient, Member: GuildMember) {
  const ShiftActive = await GetShiftActive({
    Interaction: { user: { id: Member.id }, guildId: Member.guild.id },
    UserOnly: true,
  }).catch(() => null);

  if (ShiftActive) {
    try {
      await ShiftActionLogger.LogShiftAutomatedEnd(
        await ShiftActive.end(),
        Member,
        "User has left the server. Automatically ended active shift."
      );
    } catch (Err: any) {
      AppLogger.error({
        message: "Failed to end shift upon user leaving a server. Member ID: %s, Guild ID: %s",
        label: "Events:GuildMemberRemove",
        stack: Err.stack,
        splat: [Member.id, Member.guild.id],
      });
    }
  }
}
