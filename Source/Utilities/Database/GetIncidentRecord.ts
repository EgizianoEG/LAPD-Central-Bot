import { AggregateResults } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";

export default async function GetIncidentRecord(Guild: string, IncidentNum: number) {
  return GuildModel.aggregate<AggregateResults.GetIncidentRecord>([
    {
      $match: {
        _id: Guild,
        "logs.incidents._id": IncidentNum,
      },
    },
    {
      $unwind: "$logs.incidents",
    },
    {
      $match: {
        "logs.incidents._id": IncidentNum,
      },
    },
    {
      $project: {
        _id: false,
        incident: "$logs.incidents",
      },
    },
  ])
    .limit(1)
    .then((Result) => {
      if (Result[0]) return Result[0].incident;
      else return null;
    });
}
