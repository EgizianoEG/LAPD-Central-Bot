/* eslint-disable sonarjs/no-duplicate-string */
import { GuildMember } from "discord.js";
import GuildModel from "@Models/Guild.js";

export interface StaffFieldActivityReturn {
  arrests_made: number;
  arrests_assisted: number;
  citations_issued: {
    warnings: number;
    fines: number;
    total: number;
  };
}

/**
 * Returns the field activity data for a specific staff member.
 * @param StaffMember - The staff member whose field activity data should be returned.
 * @param [After] - The date after which the field activity data should be returned/considered.
 * @returns The field activity data for the specified staff member.
 * @throws {AppError} - Throws a showable error if the guild document is not found, which is irregular to actually happen.
 */
export default async function GetStaffFieldActivity(
  StaffMember: GuildMember,
  After?: Date | null
): Promise<StaffFieldActivityReturn> {
  return GuildModel.aggregate([
    {
      $match: {
        _id: StaffMember.guild.id,
      },
    },
    {
      $project: {
        logs: 1,
      },
    },
    {
      $addFields: {
        arrests: {
          $filter: {
            input: "$logs.arrests",
            as: "arrest",
            cond: {
              $and: [
                { $eq: [StaffMember.id, "$$arrest.arresting_officer.discord_id"] },
                {
                  $cond: {
                    if: After,
                    then: { $gt: ["$$arrest.made_on", After] },
                    else: true,
                  },
                },
              ],
            },
          },
        },
        arrests_assisted: {
          $filter: {
            input: "$logs.arrests",
            as: "arrest",
            cond: {
              $and: [
                { $in: [StaffMember.id, "$$arrest.assisting_officers"] },
                {
                  $cond: {
                    if: After,
                    then: { $gt: ["$$arrest.made_on", After] },
                    else: true,
                  },
                },
              ],
            },
          },
        },
        citations: {
          $filter: {
            input: "$logs.citations",
            as: "citation",
            cond: {
              $and: [
                { $eq: [StaffMember.id, "$$citation.citing_officer.discord_id"] },
                {
                  $cond: {
                    if: After,
                    then: { $gt: ["$$citation.issued_on", After] },
                    else: true,
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        arrests_made: { $size: "$arrests" },
        arrests_assisted: { $size: "$arrests_assisted" },
        citations_issued: {
          total: { $size: "$citations" },
          warnings: {
            $size: {
              $filter: {
                input: "$citations",
                as: "citation",
                cond: { $eq: ["$$citation.type", "Warning"] },
              },
            },
          },
          fines: {
            $size: {
              $filter: {
                input: "$citations",
                as: "citation",
                cond: { $eq: ["$$citation.type", "Fine"] },
              },
            },
          },
        },
      },
    },
  ]).then((FieldData: undefined | StaffFieldActivityReturn[]) => {
    if (!FieldData || FieldData.length === 0) {
      FieldData = [
        {
          arrests_made: 0,
          arrests_assisted: 0,
          citations_issued: {
            warnings: 0,
            fines: 0,
            total: 0,
          },
        },
      ];
    }

    return FieldData[0];
  });
}
