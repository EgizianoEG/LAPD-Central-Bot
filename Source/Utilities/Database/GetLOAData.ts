import { LeaveOfAbsence } from "@Typings/Utilities/Database.js";
import LeaveModel from "@Models/LeaveOfAbsence.js";

interface GetLOADataOptions {
  guild_id: string;
  user_id?: string;

  /** @optional The date to compare LOAs to when talking about if they are expired or not. Defaults to the current date, `new Date()`. */
  comparison_date?: Date;
}

interface GetLOADataReturn {
  /** The most recent leave of absence which has ended. */
  recent_loa: LeaveOfAbsence.LeaveOfAbsenceHydratedDocument | null;

  /** The currently active leave of absence. */
  active_loa: LeaveOfAbsence.LeaveOfAbsenceHydratedDocument | null;

  /** The currently pending leave of absence. */
  pending_loa: LeaveOfAbsence.LeaveOfAbsenceHydratedDocument | null;

  /** All leave of absences taken; i.e. leaves that have been approved and ended. */
  loas_taken: LeaveOfAbsence.LeaveOfAbsenceHydratedDocument[];

  /** All records of leave of absences including the ones that have been denied or cancelled. */
  all_loas: LeaveOfAbsence.LeaveOfAbsenceHydratedDocument[];
}

/**
 * Returns an object representing the leave of absence data for the given user. This can be used for displaying LOA statistics.
 * @param Opts - The options for this function.
 * @returns
 */
export default async function GetLOAsData(Opts: GetLOADataOptions): Promise<GetLOADataReturn> {
  const ComparisonDate = Opts.comparison_date || new Date();
  const LOAs = await LeaveModel.find({ guild: Opts.guild_id, user: Opts.user_id })
    .sort({ end_date: -1 })
    .exec();

  const ActiveOrPendingLOA = LOAs.find(
    (LOA) =>
      LOA.status === "Pending" ||
      (LOA.status === "Approved" && LOA.early_end_date === null && LOA.end_date > ComparisonDate)
  );

  const PreviouslyEndedLOAs = LOAs.filter(
    (LOA) =>
      LOA.review_date &&
      LOA.status === "Approved" &&
      (LOA.early_end_date ?? LOA.end_date) < ComparisonDate
  );

  return {
    recent_loa: PreviouslyEndedLOAs[0],
    active_loa: ActiveOrPendingLOA?.status === "Approved" ? ActiveOrPendingLOA : null,
    pending_loa: ActiveOrPendingLOA?.status === "Pending" ? ActiveOrPendingLOA : null,
    loas_taken: PreviouslyEndedLOAs,
    all_loas: LOAs,
  };
}
