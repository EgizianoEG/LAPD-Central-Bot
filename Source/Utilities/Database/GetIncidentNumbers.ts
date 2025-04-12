import { AggregateResults } from "@Typings/Utilities/Database.js";
import IncidentModel from "@Models/Incident.js";

export default async function GetAllIncidentNums(
  GuildId: string
): Promise<AggregateResults.GetIncidentNumbers[]> {
  return IncidentModel.aggregate<AggregateResults.GetIncidentNumbers>([
    {
      $match: {
        guild: GuildId,
      },
    },
    {
      $set: {
        reported_on: {
          $dateToString: {
            date: "$reported_on",
            timezone: "America/Los_Angeles",
            format: "%B %d, %G at %H:%M",
          },
        },
      },
    },
    {
      $project: {
        num: "$num",
        autocomplete_label: {
          $concat: ["INC-", "$num", " - ", "$type", " – Reported on ", "$reported_on"],
        },
      },
    },
  ]).exec();
}
