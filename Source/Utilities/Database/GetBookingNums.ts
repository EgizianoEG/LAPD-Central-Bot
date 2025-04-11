import { AggregateResults } from "@Typings/Utilities/Database.js";
import ArrestModel from "@Models/Arrest.js";

export default async function GetAllBookingNums(GuildId: string) {
  return ArrestModel.aggregate<AggregateResults.GetBookingNumbers>([
    {
      $match: {
        guild: GuildId,
      },
    },
    {
      $project: {
        arrestee: 1,
        doa: {
          $dateToString: {
            date: "$made_on",
            format: "%B %d, %G at %H:%M [PDT]",
            timezone: "America/Los_Angeles",
          },
        },
        num: {
          $toString: "$booking_num",
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
              $concat: ["#", "$num", " – ", "$arrestee.formatted_name", " – ", "$doa"],
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
