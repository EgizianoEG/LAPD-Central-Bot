import { differenceInHours, isAfter } from "date-fns";
import { Collection, Guild, GuildMember } from "discord.js";
import { AggregateResults } from "@Typings/Utilities/Database.js";
import GetGuildSettings from "./GetGuildSettings.js";
import GetShiftTypes from "./GetShiftTypes.js";
import ProfileModel from "@Models/GuildProfile.js";
import DHumanize from "humanize-duration";
import AppError from "@Utilities/Classes/AppError.js";

const HumanizeDuration = DHumanize.humanizer({
  conjunction: " and ",
  largest: 5,
  round: true,
});

interface GetActivityReportDataOpts {
  /** The guild to get the activity report data for. */
  guild: Guild;

  /** The users to limit the activity report data to. */
  members: Collection<string, GuildMember>;

  /** The date to return the activity report data after. If not provided, defaults to all the time. */
  after?: Date | null;

  /** The shift type to get the activity report data for. */
  shift_type?: string | null;

  /** The duration in milliseconds of the quota that must be met. Defaults to 0 seconds, which means no quota. */
  quota_duration?: number | null;

  /** Whether or not to include member nicknames in the activity report data. Defaults to `false`. */
  include_member_nicknames?: boolean;
}

interface UserEnteredValue {
  numberValue?: number;
  stringValue?: string;
  boolValue?: boolean;
}

interface RecordValue {
  userEnteredValue: UserEnteredValue;
}

interface Record {
  values: RecordValue[];
}

interface ActivityReportDataReturn {
  /** The shift time requirement if any. Defaults to `"None"` if the time requirement is not provided or zero seconds. */
  quota: string;

  /** Prepared activity report data to fill the google spreadsheet template. */
  records: Record[];

  /** Prepared statistics for the report's second sheet. */
  statistics: AggregateResults.ActivityReportStatistics<string>;
}

/**
 * Retrieves activity report data based on the provided options.
 * @param Opts - The options for retrieving activity report data.
 * @returns An object containing the guild, records, statistics, and shift type of the activity report.
 */
export default async function GetActivityReportData(
  Opts: GetActivityReportDataOpts
): Promise<ActivityReportDataReturn> {
  if (Opts.shift_type && !Opts.shift_type.match(/^Default$/i)) {
    const GuildShiftTypes = await GetShiftTypes(Opts.guild.id);
    const ShiftType = GuildShiftTypes.find((ST) => ST.name === Opts.shift_type)!;
    const FilteredMembers = Opts.members.filter((Member) =>
      Member.roles.cache.hasAny(...ShiftType.access_roles)
    );

    Opts.members = FilteredMembers;
  } else {
    const GuildConfig = await GetGuildSettings(Opts.guild.id);
    if (!GuildConfig) throw new AppError({ template: "GuildConfigNotFound", showable: true });

    const FilteredMembers = Opts.members.filter((Member) =>
      Member.roles.cache.hasAny(
        ...GuildConfig.role_perms.staff,
        ...GuildConfig.role_perms.management
      )
    );

    Opts.members = FilteredMembers;
  }

  const RetrieveDate = new Date();
  const RecordsBaseData = await ProfileModel.aggregate<
    AggregateResults.BaseActivityReportData["records"][number]
  >(GetAggregationPipelineNoShiftType(Opts));

  const ReportStatistics: AggregateResults.ActivityReportStatistics<string> = {
    total_time: HumanizeDuration(RecordsBaseData.reduce((Acc, Curr) => Acc + Curr.total_time, 0)),
    total_shifts: RecordsBaseData.reduce((Acc, Curr) => Acc + Curr.total_shifts, 0),
  };

  if (RecordsBaseData.length === 0) {
    throw new AppError({
      title: "No Records Found",
      message: "There were no enough records on the database to generate the requested report.",
      showable: true,
    });
  }

  const Records = RecordsBaseData.map((Record, Index) => {
    const Member = Opts.members.find((U) => U.id === Record.id);
    let LeaveActive = false;
    let LeaveNote: string | null = null;
    Opts.members.delete(Member?.user.id ?? "");

    // Add leave of absence comments if it has ended or started recently.
    if (Record.recent_loa?.status === "Approved" && Record.recent_loa.reviewed_by) {
      if (
        Record.recent_loa.review_date !== null &&
        Record.recent_loa.early_end_date === null &&
        isAfter(Record.recent_loa.end_date, RetrieveDate)
      ) {
        LeaveActive = true;
        const StartCurrentDatesDifferenceInDays =
          differenceInHours(RetrieveDate, Record.recent_loa.review_date) / 24;

        if (StartCurrentDatesDifferenceInDays <= 2.5) {
          const RelativeDuration = DHumanize(
            RetrieveDate.getTime() - Record.recent_loa.review_date.getTime(),
            {
              conjunction: " and ",
              largest: 2,
              round: true,
            }
          );

          LeaveNote = `Leave of absence started around ${RelativeDuration} ago.\nApproved by: @${Record.recent_loa.reviewed_by.username}`;
        }
      } else {
        const LeaveEndDate = Record.recent_loa.early_end_date || Record.recent_loa.end_date;
        const EndCurrentDatesDifferenceInDays = differenceInHours(RetrieveDate, LeaveEndDate) / 24;

        if (EndCurrentDatesDifferenceInDays <= 2.5) {
          const RelativeDuration = DHumanize(RetrieveDate.getTime() - LeaveEndDate.getTime(), {
            conjunction: " and ",
            largest: 2,
            round: true,
          });

          LeaveNote = `Leave of absence ended around ${RelativeDuration} ago.`;
        }
      }
    }

    return {
      values: [
        { userEnteredValue: { numberValue: Index + 1 } },
        {
          userEnteredValue: {
            stringValue: FormatName(Member ?? Record.id, Opts.include_member_nicknames),
          },
        },
        { userEnteredValue: { stringValue: Member?.roles.highest.name ?? "N/A" } },
        { userEnteredValue: { stringValue: HumanizeDuration(Record.total_time) } },
        { userEnteredValue: { numberValue: Record.arrests } },
        { userEnteredValue: { numberValue: Record.arrests_assisted } },
        { userEnteredValue: { numberValue: Record.citations } },
        { userEnteredValue: { stringValue: Record.quota_met ? "Yes" : "No" } },
        { userEnteredValue: { stringValue: LeaveActive ? "Yes" : "No" }, note: LeaveNote },
      ],
    };
  });

  // Add remaining members whose data was not available on the database to the report.
  Opts.members.forEach((Member) => {
    Records.push({
      values: [
        { userEnteredValue: { numberValue: Records.length + 1 } },
        { userEnteredValue: { stringValue: Member.user.username } },
        { userEnteredValue: { stringValue: Member.roles.highest.name } },
        { userEnteredValue: { stringValue: HumanizeDuration(0) } },
        { userEnteredValue: { numberValue: 0 } },
        { userEnteredValue: { numberValue: 0 } },
        { userEnteredValue: { numberValue: 0 } },
        { userEnteredValue: { stringValue: Opts.quota_duration ? "No" : "Yes" } },
        { userEnteredValue: { stringValue: "No" } },
      ],
    });
  });

  return {
    statistics: ReportStatistics,
    records: Records,
    quota: Opts.quota_duration ? HumanizeDuration(Opts.quota_duration) : "None",
  };
}

// ---------------------------------------------------------------------------------------
// Helpers:
// --------
function FormatName(Member: GuildMember | string, IncludeNickname?: boolean) {
  if (typeof Member === "string") return Member;
  return IncludeNickname && (Member.nickname || Member.displayName)
    ? `${Member.nickname ?? Member.displayName} (@${Member.user.username})`
    : `${Member.user.username}`;
}

function GetAggregationPipelineNoShiftType(
  Opts: GetActivityReportDataOpts
): Parameters<typeof ProfileModel.aggregate>[0] {
  return [
    {
      $match: {
        guild: Opts.guild.id,
        user: { $in: Opts.members.map((U) => U.id) },
      },
    },
    {
      $project: {
        guild: 1,
        user: 1,
      },
    },
    {
      $lookup: {
        as: "guild_doc",
        from: "guilds",
        localField: "guild",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 0,
              "logs.arrests": 1,
              "logs.citations": 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        as: "shifts",
        from: "shifts",
        let: { guild: "$guild", user: "$user" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$guild", "$$guild"] },
                  { $eq: ["$user", "$$user"] },
                  { $ne: ["$end_timestamp", null] },
                  {
                    $or: [Opts.after ? { $gte: ["$start_timestamp", Opts.after] } : true],
                  },
                  {
                    $or: [Opts.shift_type ? { $eq: ["$type", Opts.shift_type] } : true],
                  },
                ],
              },
            },
          },
          {
            $project: {
              events: 1,
              end_timestamp: 1,
              start_timestamp: 1,
              "durations.on_duty_mod": 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        as: "loas",
        from: "leaves",
        let: {
          guild: "$guild",
          user: "$user",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$user"] },
                  { $eq: ["$guild", "$$guild"] },
                  { $eq: ["$status", "Approved"] },
                ],
              },
            },
          },
          {
            $sort: {
              request_date: -1,
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              reviewed_by: 1,
              early_end_date: 1,
              extension_req: 1,
              request_date: 1,
              review_date: 1,
              end_date: 1,
              status: 1,
            },
          },
        ],
      },
    },
    {
      $set: {
        guild: { $arrayElemAt: ["$guild_doc", 0] },
        recent_loa: { $first: "$loas" },
        total_shifts: {
          $size: "$shifts",
        },
        total_on_duty_mod: {
          $sum: "$shifts.durations.on_duty_mod",
        },
        total_duration: {
          $sum: {
            $map: {
              input: "$shifts",
              as: "shift",
              in: {
                $subtract: ["$$shift.end_timestamp", "$$shift.start_timestamp"],
              },
            },
          },
        },
        break_duration: {
          $sum: {
            $map: {
              input: "$shifts",
              as: "shift",
              in: {
                $sum: {
                  $map: {
                    input: "$$shift.events.breaks",
                    as: "break",
                    in: {
                      $subtract: [
                        { $arrayElemAt: ["$$break", 1] },
                        { $arrayElemAt: ["$$break", 0] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $set: {
        arrests: {
          $size: {
            $filter: {
              input: "$guild.logs.arrests",
              as: "arrest",
              cond: {
                $and: [
                  {
                    $eq: ["$user", "$$arrest.arresting_officer.discord_id"],
                  },
                  {
                    $cond: {
                      if: Opts.after,
                      then: {
                        $gte: ["$$arrest.made_on", Opts.after],
                      },
                      else: true,
                    },
                  },
                ],
              },
            },
          },
        },
        arrests_assisted: {
          $size: {
            $filter: {
              input: "$guild.logs.arrests",
              as: "arrest",
              cond: {
                $and: [
                  {
                    $in: ["$user", "$$arrest.assisting_officers"],
                  },
                  {
                    $cond: {
                      if: Opts.after,
                      then: {
                        $gte: ["$$arrest.made_on", Opts.after],
                      },
                      else: true,
                    },
                  },
                ],
              },
            },
          },
        },
        citations: {
          $size: {
            $filter: {
              input: "$guild.logs.citations",
              as: "citation",
              cond: {
                $and: [
                  {
                    $eq: ["$user", "$$citation.citing_officer.discord_id"],
                  },
                  {
                    $cond: {
                      if: Opts.after,
                      then: {
                        $gte: ["$$citation.issued_on", Opts.after],
                      },
                      else: true,
                    },
                  },
                ],
              },
            },
          },
        },
        total_time: {
          $max: [
            {
              $add: [
                {
                  $subtract: ["$total_duration", "$break_duration"],
                },
                "$total_on_duty_mod",
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: "$user",
        total_time: 1,
        total_shifts: 1,
        arrests_assisted: 1,
        recent_loa: 1,
        citations: 1,
        arrests: 1,
        quota_met: {
          $gte: ["$total_time", Opts.quota_duration ?? 0],
        },
      },
    },
    {
      $sort: {
        total_time: -1,
      },
    },
  ];
}
