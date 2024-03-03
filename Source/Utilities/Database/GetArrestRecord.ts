import { AggregateResults } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";

export default async function GetArrestRecord(Guild: string, ArrestId: number) {
  return GuildModel.aggregate<AggregateResults.GetArrestRecord>([
    {
      $match: {
        _id: Guild,
      },
    },
    {
      $unwind: "$logs.arrests",
    },
    {
      $match: {
        "logs.arrests._id": ArrestId,
      },
    },
    {
      $project: {
        _id: false,
        arrest: "$logs.arrests",
      },
    },
  ]).then((Result) => {
    if (Result[0]) return Result[0].arrest;
    else return null;
  });
}
