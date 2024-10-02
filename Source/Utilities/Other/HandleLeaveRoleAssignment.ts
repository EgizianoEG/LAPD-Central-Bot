import { Guild, GuildMember } from "discord.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";

/**
 * Handles shift role(s) assignment based on the current leave status of a user.
 * @param UserId - The user(s) to assign leave role to.
 * @param Guild - The guild the user is in.
 * @param IsOnLeave - Whether the user is on leave or not.
 */
export default async function HandleLeaveRoleAssignment(
  UserId: string | string[],
  Guild: Guild,
  IsOnLeave: boolean
) {
  const LeaveRole = await GetGuildSettings(Guild.id).then((Settings) => {
    if (!Settings) return null;
    return Settings.leave_notices.leave_role;
  });

  if (!LeaveRole) return;
  if (Array.isArray(UserId)) {
    return Promise.all(
      UserId.map(async (User) => {
        const GuildMember = await Guild.members.fetch(User).catch(() => null);
        if (!GuildMember) return Promise.resolve();
        return HandleSingleUserRoleAssignment(LeaveRole, GuildMember, IsOnLeave);
      })
    );
  } else {
    const GuildMember = await Guild.members.fetch(UserId).catch(() => null);
    if (!GuildMember) return;
    return HandleSingleUserRoleAssignment(LeaveRole, GuildMember, IsOnLeave);
  }
}

async function HandleSingleUserRoleAssignment(
  OnLeaveRole: string,
  GuildMember: GuildMember,
  IsOnLeave: boolean
) {
  if (!GuildMember) return Promise.resolve();
  return IsOnLeave
    ? GuildMember.roles.add(OnLeaveRole, "Staff member is on leave of absence.")
    : GuildMember.roles.remove(OnLeaveRole, "Staff member is not on leave anymore.");
}
