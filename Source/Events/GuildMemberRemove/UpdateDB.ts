import { ActiveShiftsCache } from "@Utilities/Other/Cache.js";
import { GuildMember } from "discord.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param _
 * @param Member
 */
export default async function (_: DiscordClient, Member: GuildMember) {
  const CurrDate = new Date();
  const ShiftActive = await GetShiftActive({
    Interaction: { user: { id: Member.id }, guildId: Member.guild.id },
    UserOnly: true,
  });

  if (ShiftActive) {
    try {
      await ShiftActive.end(CurrDate);
      ActiveShiftsCache.del(ShiftActive._id);
    } catch (Err: any) {
      AppLogger.error({
        label: "Events:GuildMemberRemove",
        message: "Failed to end shift upon user leaving a server.",
        stack: Err.stack,
      });
    }
  }
}
