import { type CronJobFileDefReturn } from "@Typings/Global.js";
import { LeaveOfAbsence } from "@Typings/Utilities/Database.js";
import { subDays } from "date-fns";

import HandleLeaveRoleAssignment from "@Utilities/Other/HandleLeaveRoleAssignment.js";
import LeaveOfAbsenceModel from "@Models/LeaveOfAbsence.js";
import LOAEventLogger from "@Utilities/Classes/LOAEventLogger.js";

/**
 * Handle leave of absence expiration and role assignment if the `end_handled` property is still `false`.
 * This will only handle leaves expired in the last 7 days or less to avoid false positives or very late responses.
 * @param _
 * @param Client
 * @returns
 */
async function HandleExpiredLeaves(Now: Date | "init" | "manual", Client: DiscordClient) {
  const CurrentDate = Now instanceof Date ? Now : new Date();
  const SevenDaysAgo = subDays(CurrentDate, 7);
  const LOAsHandled: string[] = [];
  const LeaveDocuments = await LeaveOfAbsenceModel.aggregate<LeaveOfAbsence.LeaveOfAbsenceDocument>(
    [
      {
        $match: {
          status: "Approved",
          end_handled: false,
          $or: [
            { early_end_date: { $lte: CurrentDate, $gte: SevenDaysAgo } },
            { end_date: { $lte: CurrentDate, $gte: SevenDaysAgo } },
          ],
        },
      },
      {
        $lookup: {
          from: "leaves",
          as: "active_loas",
          let: { guild_id: "$guild", user_id: "$user" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$guild", "$$guild_id"] },
                    { $eq: ["$user", "$$user_id"] },
                    { $eq: ["$status", "Approved"] },
                    { $eq: ["$early_end_date", null] },
                    { $gt: ["$end_date", CurrentDate] },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $match: {
          active_loas: { $eq: [] },
        },
      },
      {
        $project: {
          active_loas: 0,
        },
      },
    ]
  ).exec();

  if (!LeaveDocuments.length) return;
  const CategorizedByGuild = Object.groupBy(LeaveDocuments, (Leave) => Leave.guild);
  const GuildIds = Object.keys(CategorizedByGuild);

  for (const GuildId of GuildIds) {
    const GuildInst = await Client.guilds.fetch(GuildId).catch(() => null);
    if (!GuildInst) continue;
    if (!CategorizedByGuild[GuildId]?.length) continue;
    for (const Leave of CategorizedByGuild[GuildId]) {
      LOAsHandled.push(Leave._id as unknown as string);
      HandleLeaveRoleAssignment(Leave.user, GuildInst, false).catch(() => null);
      LOAEventLogger.LogLeaveEnd(Client, LeaveOfAbsenceModel.hydrate(Leave), CurrentDate);
    }
  }

  return LeaveOfAbsenceModel.updateMany(
    { _id: { $in: LOAsHandled } },
    { $set: { end_handled: true } }
  ).exec();
}

export default {
  cron_exp: "*/3 * * * *",
  cron_func: HandleExpiredLeaves as any,
  cron_opts: {
    timezone: "America/Los_Angeles",
    errorHandlingMechanism: "silent/log",
  },
} as CronJobFileDefReturn;
