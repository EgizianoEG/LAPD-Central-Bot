import { Guild, GuildMember } from "discord.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";

/**
 * Handles shift role(s) assignment based on the current shift status of the user.
 * @param CurrentStatus - The current status of the shift ("on-duty", "on-break", or "off-duty").
 * @param Client - The Discord client.
 * @param GuildId - The ID of the user's guild/shift's guild.
 * @param UserId - The ID of the user whose shift status is being handled. Could be an array to handle multiple users at once.
 */
export default async function HandleShiftRoleAssignment(
  CurrentStatus: "on-duty" | "on-break" | "off-duty",
  Client: DiscordClient,
  Guild: Guild | string,
  UserId: string | string[]
) {
  Guild = typeof Guild === "string" ? await Client.guilds.fetch(Guild) : Guild;
  const RASettings = await GetGuildSettings(Guild.id).then((Settings) => {
    if (!Settings) return null;
    return Settings.shift_management.role_assignment;
  });

  if (
    !Guild ||
    !RASettings ||
    (RASettings.on_duty.length === 0 && RASettings.on_break.length === 0)
  ) {
    return;
  }

  if (Array.isArray(UserId)) {
    return Promise.all(
      UserId.map(async (User) => {
        const GuildMember = await Guild.members.fetch(User).catch(() => null);
        if (!GuildMember) return Promise.resolve();
        return HandleSingleUserRoleAssignment(RASettings, GuildMember, CurrentStatus);
      })
    );
  } else {
    const GuildMember = await Guild.members.fetch(UserId).catch(() => null);
    if (!GuildMember) return;
    return HandleSingleUserRoleAssignment(RASettings, GuildMember, CurrentStatus);
  }
}

async function HandleSingleUserRoleAssignment(
  RASettings: NonNullable<
    Awaited<ReturnType<typeof GetGuildSettings>>
  >["shift_management"]["role_assignment"],
  GuildMember: GuildMember,
  CurrentStatus: "on-duty" | "on-break" | "off-duty"
) {
  if (!GuildMember) return Promise.resolve();
  if (CurrentStatus === "on-duty") {
    return Promise.all([
      GuildMember.roles.remove(RASettings.on_break, "Member is no longer on-break."),
      GuildMember.roles.add(RASettings.on_duty, "Member is on an active shift and on-duty."),
    ]);
  } else if (CurrentStatus === "on-break") {
    return Promise.all([
      GuildMember.roles.remove(RASettings.on_duty, "Member is currently taking a shift break."),
      GuildMember.roles.add(RASettings.on_break, "Member has started a shift break."),
    ]);
  } else {
    return GuildMember.roles.remove(
      [...RASettings.on_duty, ...RASettings.on_break],
      "Member is now off-duty and no longer on shift."
    );
  }
}
