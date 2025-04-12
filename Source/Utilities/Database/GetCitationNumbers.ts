import { AggregateResults } from "@Typings/Utilities/Database.js";
import CitationModel from "@Models/Citation.js";

export default async function GetAllCitationNums(
  GuildId: string
): Promise<AggregateResults.GetCitationNumbers[]> {
  return CitationModel.aggregate<AggregateResults.GetCitationNumbers>([
    {
      $match: {
        guild: GuildId,
      },
    },
    {
      $project: {
        num: "$num",
        autocomplete_label: {
          $concat: ["#", { $toString: "$num" }, " – ", "$dov", " at ", "$tov", " ", "$ampm"],
        },
      },
    },
  ]).exec();
}
