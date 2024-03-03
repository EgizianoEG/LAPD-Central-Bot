import { AggregateResults } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";

export default async function GetCitationRecord(Guild: string, CitNum: number) {
  return GuildModel.aggregate<AggregateResults.GetCitationRecord>([
    {
      $match: {
        _id: Guild,
      },
    },
    {
      $unwind: "$logs.citations",
    },
    {
      $match: {
        "logs.citations.num": CitNum,
      },
    },
    {
      $project: {
        _id: false,
        citation: "$logs.citations",
      },
    },
  ]).then((Result) => {
    if (Result[0]) return Result[0].citation;
    else return null;
  });
}
