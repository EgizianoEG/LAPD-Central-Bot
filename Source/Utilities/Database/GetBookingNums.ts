import { AggregateResults } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";

export default async function GetAllBookingNums(GuildId: string) {
  return GuildModel.aggregate<AggregateResults.GetBookingNumbers>([
    {
      $match: {
        _id: GuildId,
      },
    },
    {
      $unwind: "$logs.arrests",
    },
    {
      $project: {
        doa: {
          $dateToString: {
            date: "$logs.arrests.made_on",
            format: "%Y-%m-%d",
            timezone: "America/Los_Angeles",
          },
        },
        num: {
          $toString: "$logs.arrests._id",
        },
      },
    },
    {
      $group: {
        _id: 0,
        bookings: {
          $push: {
            num: "$num",
            autocomplete_label: {
              $concat: ["#", "$num", " – ", "$doa"],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        bookings: 1,
      },
    },
  ])
    .then((Results) =>
      Results[0]?.bookings.length && Results[0].bookings[0]
        ? Results[0].bookings
        : ([] as AggregateResults.GetBookingNumbers["bookings"])
    )
    .catch(() => [] as AggregateResults.GetBookingNumbers["bookings"]);
}
