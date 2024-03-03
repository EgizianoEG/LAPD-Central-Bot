/* eslint-disable sonarjs/no-duplicate-string */
import { AggregateResults } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";

export default async function GetUserRecords(GuildId: string, RobloxId: number) {
  return GuildModel.aggregate<AggregateResults.GetUserRecords>([
    {
      $match: {
        _id: GuildId,
      },
    },
    {
      $project: {
        _id: false,
        arrests: {
          $sortArray: {
            sortBy: { made_at: -1 },
            input: {
              $filter: {
                input: "$logs.arrests",
                as: "record",
                cond: {
                  $eq: ["$$record.arrestee.roblox_id", RobloxId],
                },
              },
            },
          },
        },
        citations: {
          $sortArray: {
            sortBy: { issued_at: -1 },
            input: {
              $filter: {
                input: "$logs.citations",
                as: "record",
                cond: {
                  $eq: ["$$record.violator.id", RobloxId],
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        arrests: 1,
        citations: 1,

        total_arrests: { $size: "$arrests" },
        total_citations: { $size: "$citations" },

        recent_arrest: {
          $cond: {
            if: { $eq: [{ $size: "$arrests" }, 0] },
            then: null,
            else: { $arrayElemAt: ["$arrests", 0] },
          },
        },

        recent_citation: {
          $cond: {
            if: { $eq: [{ $size: "$citations" }, 0] },
            then: null,
            else: {
              $arrayElemAt: ["$citations", 0],
            },
          },
        },
      },
    },
  ]).then((Result) => Result[0]);
}
