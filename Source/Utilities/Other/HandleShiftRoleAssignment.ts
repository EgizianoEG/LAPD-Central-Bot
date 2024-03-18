import { DiscordAPIError } from "discord.js";
import GuildModel from "@Models/Guild.js";

/**
 * Handles shift role(s) assignment based on the current shift status of the user.
 * @param CurrentStatus - The current status of the shift ("on-duty", "on-break", or "off-duty").
 * @param Client - The Discord client.
 * @param GuildId - The ID of the user's guild/shift's guild.
 * @param UserId - The ID of the user whose shift status is being handled.
 */
export default async function HandleRoleAssignment(
  CurrentStatus: "on-duty" | "on-break" | "off-duty",
  Client: DiscordClient,
  GuildId: string,
  UserId: string
) {
  const RASettings = await GuildModel.findById(GuildId).then((Doc) => {
    if (!Doc) return null;
    return Doc.settings.shifts.role_assignment;
  });

  if (!RASettings) return;
  try {
    const Guild = Client.guilds.cache.get(GuildId);
    const GuildMember = Guild?.members.cache.get(UserId);
    if (!GuildMember) return;

    if (CurrentStatus === "on-duty") {
      await GuildMember.roles.remove(RASettings.on_break, "User is no longer on-break.");
      await GuildMember.roles.add(RASettings.on_duty, "User is on an active shift and on-duty.");
    } else if (CurrentStatus === "on-break") {
      await GuildMember.roles.remove(RASettings.on_duty, "User is currently taking a shift break.");
      await GuildMember.roles.add(RASettings.on_break, "User has started a shift break.");
    } else {
      await GuildMember.roles.remove(
        [...RASettings.on_duty, ...RASettings.on_break],
        "User is now off-duty and no longer on shift."
      );
    }
  } catch (Err) {
    // Ignore Discord permission errors.
    if (Err instanceof DiscordAPIError && (Err.code === 50_013 || Err.code === 50_001)) {
      return;
    }
    throw Err;
  }
}
