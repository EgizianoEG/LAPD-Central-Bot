import { AggregateResults } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";

export default async function GetAllCitationNums(GuildId: string) {
  return GuildModel.aggregate<AggregateResults.GetCitationNumbers>([
    {
      $match: {
        _id: GuildId,
      },
    },
    {
      $unwind: "$logs.citations",
    },
    {
      $project: {
        dov: "$logs.citations.dov",
        num: {
          $toString: "$logs.citations.num",
        },
      },
    },
    {
      $group: {
        _id: 0,
        citations: {
          $push: {
            num: "$num",
            autocomplete_label: {
              $concat: ["#", "$num", " – ", "$dov"],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        citations: 1,
      },
    },
  ])
    .then((Results) =>
      Results[0]?.citations.length && Results[0].citations[0]
        ? Results[0].citations
        : ([] as AggregateResults.GetCitationNumbers["citations"])
    )
    .catch(() => [] as AggregateResults.GetCitationNumbers["citations"]);
}
