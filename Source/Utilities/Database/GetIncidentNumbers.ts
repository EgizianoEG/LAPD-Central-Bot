import { AggregateResults } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";

export default async function GetAllIncidentNums(GuildId: string) {
  return GuildModel.aggregate<AggregateResults.GetIncidentNumbers>([
    {
      $match: {
        _id: GuildId,
      },
    },
    {
      $unwind: "$logs.incidents",
    },
    {
      $project: {
        reported_on: {
          $dateToString: {
            date: "$logs.incidents.reported_on",
            timezone: "America/Los_Angeles",
            format: "%B %d, %G at %H:%M [PDT]",
          },
        },
        num: {
          $toString: "$logs.incidents._id",
        },
      },
    },
    {
      $group: {
        _id: 0,
        incidents: {
          $push: {
            num: "$num",
            autocomplete_label: {
              $concat: ["#", "$num", " – Reported on ", "$reported_on"],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        incidents: 1,
      },
    },
  ])
    .then((Results) =>
      Results[0]?.incidents.length && Results[0].incidents[0]
        ? Results[0].incidents
        : ([] as AggregateResults.GetIncidentNumbers["incidents"])
    )
    .catch(() => [] as AggregateResults.GetIncidentNumbers["incidents"]);
}
