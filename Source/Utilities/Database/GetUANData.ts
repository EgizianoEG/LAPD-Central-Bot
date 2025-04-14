import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import UserActivityNoticeModel from "@Models/UserActivityNotice.js";

interface GetUANDataOptions {
  guild_id: string;
  user_id?: string;

  /**
   * @optional The date to compare activity notices to when determining if they are expired or not.
   * @default new Date()  // (to the current date)
   */
  comparison_date?: Date;
}

interface GetUANDataReturn {
  /* The most recent activity notice (leave of absence or reduced activity) that has ended. */
  recent_notice: UserActivityNotice.ActivityNoticeHydratedDocument | null;

  /* The currently active activity notice (leave of absence or reduced activity). */
  active_notice: UserActivityNotice.ActivityNoticeHydratedDocument | null;

  /* The currently pending activity notice (leave of absence or reduced activity). */
  pending_notice: UserActivityNotice.ActivityNoticeHydratedDocument | null;

  /* All activity notices that have been approved and ended. */
  completed_notices: UserActivityNotice.ActivityNoticeHydratedDocument[];

  /* All activity notices, including those that have been denied or cancelled. */
  notice_history: UserActivityNotice.ActivityNoticeHydratedDocument[];
}

/**
 * Retrieves an object representing the activity notice data for the given user.
 * This can be used for displaying statistics or managing activity notices.
 * @param Opts - The options for this function.
 * @returns An object containing categorized activity notices.
 */
export default async function GetUANData(Opts: GetUANDataOptions): Promise<GetUANDataReturn> {
  const ComparisonDate = Opts.comparison_date || new Date();
  const Notices = await UserActivityNoticeModel.find({ guild: Opts.guild_id, user: Opts.user_id })
    .sort({ end_date: -1 })
    .exec();

  const ActiveOrPendingNotice = Notices.find(
    (Notice) =>
      Notice.status === "Pending" ||
      (Notice.status === "Approved" &&
        Notice.early_end_date === null &&
        Notice.end_date > ComparisonDate)
  );

  const PreviouslyEndedNotices = Notices.filter(
    (Notice) =>
      Notice.review_date &&
      Notice.status === "Approved" &&
      (Notice.early_end_date ?? Notice.end_date) < ComparisonDate
  );

  return {
    recent_notice: PreviouslyEndedNotices[0] || null,
    active_notice: ActiveOrPendingNotice?.status === "Approved" ? ActiveOrPendingNotice : null,
    pending_notice: ActiveOrPendingNotice?.status === "Pending" ? ActiveOrPendingNotice : null,
    completed_notices: PreviouslyEndedNotices,
    notice_history: Notices,
  };
}
