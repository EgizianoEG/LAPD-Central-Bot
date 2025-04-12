import { CitationAutocompletionCache } from "@Utilities/Other/Cache.js";
import { AggregateResults } from "@Typings/Utilities/Database.js";
import CitationModel from "@Models/Citation.js";

export default async function GetAllCitationNums(
  GuildId: string,
  UseCache: boolean = false
): Promise<AggregateResults.GetCitationNumbers[]> {
  if (UseCache) {
    const Cached = CitationAutocompletionCache.get<AggregateResults.GetCitationNumbers[]>(GuildId);
    if (Cached) return Cached;
  }

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
          $concat: [
            "#",
            { $toString: "$num" },
            " – ",
            "$type",
            " – ",
            "$dov",
            " at ",
            "$tov",
            " ",
            "$ampm",
          ],
        },
      },
    },
  ])
    .exec()
    .then((Cits) => {
      CitationAutocompletionCache.set(GuildId, Cits);
      return Cits;
    });
}
