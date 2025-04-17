import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { Guild, GuildMember } from "discord.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";

/**
 * Handles shift role(s) assignment based on the current leave status of a user.
 * @param UserId - The user(s) to assign leave role to.
 * @param Guild - The guild the user is in.
 * @param IsOnLeave - Whether the user is on leave or not.
 */
export default async function HandleUserActivityNoticeRoleAssignment(
  UserId: string | string[],
  Guild: Guild,
  TypeOfNotice: UserActivityNotice.NoticeType,
  IsNoticeActive: boolean
) {
  const GuildSettings = await GetGuildSettings(Guild.id);
  const NoticeRole =
    TypeOfNotice === "LeaveOfAbsence"
      ? GuildSettings?.leave_notices.leave_role
      : GuildSettings?.reduced_activity.ra_role;

  if (!NoticeRole) return;
  if (Array.isArray(UserId)) {
    return Promise.all(
      UserId.map(async (User) => {
        const GuildMember = await Guild.members.fetch(User).catch(() => null);
        if (!GuildMember) return Promise.resolve();
        return HandleSingleUserRoleAssignment(NoticeRole, GuildMember, IsNoticeActive);
      })
    );
  } else {
    const GuildMember = await Guild.members.fetch(UserId).catch(() => null);
    if (!GuildMember) return;
    return HandleSingleUserRoleAssignment(NoticeRole, GuildMember, IsNoticeActive);
  }
}

async function HandleSingleUserRoleAssignment(
  NoticeActiveRole: string,
  GuildMember: GuildMember,
  IsNoticeActive: boolean
) {
  if (!GuildMember) return Promise.resolve();
  return IsNoticeActive
    ? GuildMember.roles.add(NoticeActiveRole, "Staff member is on leave of absence.")
    : GuildMember.roles.remove(NoticeActiveRole, "Staff member is not on leave anymore.");
}
