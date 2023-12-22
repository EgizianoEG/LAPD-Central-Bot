import type { PropertiesToString, ExpandRecursively } from "utility-types";
import type { ExtraTypings } from "@Typings/Utilities/Database.js";
import type { FilterQuery } from "mongoose";
import DHumanize from "humanize-duration";
import ShiftModel from "@Models/Shift.js";

export type UserMainShiftsData = {
  shift_count: number;
  total_onduty: number;
  total_onbreak: number;
  total_arrests: number;
  total_citations: number;
  avg_onduty: number;
  avg_onbreak: number;
};

const HumanizeDuration = DHumanize.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

/**
 * Returns an object containing main data for a user's shifts.
 * This function utilizes the `aggregate` method of the `Shift` mongoose model.
 * @param QueryFilter - The query filter.
 * @param [HasActiveShift=false] - Whether the user has an active shift.
 * This parameter is mainly used to consider increasing shift count by one and without adding any durations.
 * @returns An object that contains main shifts data which also contains converted shift durations in human readable format.
 */
export default async function GetMainShiftsData(
  QueryFilter: FilterQuery<ExtraTypings.ShiftDocument>,
  HasActiveShift: boolean = false
) {
  QueryFilter.end_timestamp = { $ne: null };
  QueryFilter.type =
    QueryFilter.type === null || QueryFilter === undefined ? { $exists: true } : QueryFilter.type;

  return ShiftModel.aggregate([
    { $match: QueryFilter },
    {
      $group: {
        _id: null,
        shift_count: {
          $sum: 1,
        },
        total_onduty: {
          $sum: "$durations.on_duty",
        },
        total_onbreak: {
          $sum: "$durations.on_break",
        },
        total_arrests: {
          $sum: "$events.arrests",
        },
        total_citations: {
          $sum: "$events.citations",
        },
      },
    },
    {
      $project: {
        _id: 0,
        shift_count: 1,
        total_onduty: 1,
        total_onbreak: 1,
        total_arrests: 1,
        total_citations: 1,
        avg_onduty: {
          $round: {
            $divide: ["$total_onduty", "$shift_count"],
          },
        },
        avg_onbreak: {
          $round: {
            $divide: ["$total_onbreak", "$shift_count"],
          },
        },
      },
    },
  ]).then((Resp: UserMainShiftsData[]) => {
    if (Resp.length === 0) {
      Resp[0] = {
        shift_count: 0,
        total_onduty: 0,
        total_onbreak: 0,
        total_arrests: 0,
        total_citations: 0,
        avg_onduty: 0,
        avg_onbreak: 0,
      };
    }

    if (HasActiveShift) {
      Resp[0].shift_count++;
    }

    for (const [Key, Duration] of Object.entries(Resp[0])) {
      if (Key === "shift_count" || Key.endsWith("s")) continue;
      Resp[0][Key] = HumanizeDuration(Duration);
    }

    return Resp[0] as unknown as ExpandRecursively<
      PropertiesToString<UserMainShiftsData, "shift_count" | "total_arrests" | "total_citations">
    >;
  });
}
