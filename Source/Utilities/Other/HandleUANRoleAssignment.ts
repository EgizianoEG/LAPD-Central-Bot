import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { Guild, GuildMember } from "discord.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";

/**
 * Assigns or removes activity notice roles (Leave of Absence or Reduced Activity) for guild members.
 * @param UserId - The Discord user ID(s) to update roles for (can be a single string or an array of strings).
 * @param Guild - The Discord guild (server) where the role changes will occur.
 * @param TypeOfNotice - The type of activity notice ("LeaveOfAbsence" or "ReducedActivity").
 * @param IsNoticeActive - Whether to add (true) or remove (false) the corresponding role.
 * @returns A promise that resolves when all role assignments are complete, or undefined if no action was taken.
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

/**
 * Handles role assignment/removal for a single guild member.
 * @param NoticeActiveRole - The Discord role ID to add or remove.
 * @param GuildMember - The guild member object to modify roles for.
 * @param IsNoticeActive - Whether to add (true) or remove (false) the role.
 * @returns A promise that resolves when the role operation completes, or resolves immediately if GuildMember is invalid.
 */
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
