import {
  SlashCommandSubcommandBuilder,
  ModalSubmitInteraction,
  time as FormatTime,
  MessageFlags,
} from "discord.js";

import { LeaveOfAbsenceEventLogger } from "@Utilities/Classes/UANEventLogger.js";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { differenceInHours } from "date-fns";
import { milliseconds } from "date-fns/milliseconds";

import UserActivityNoticeModel from "@Models/UserActivityNotice.js";
import MentionCmdByName from "@Utilities/Other/MentionCmd.js";
import ParseDuration from "parse-duration";

const MaxDuration = milliseconds({ months: 3 });
const MinimumDuration = milliseconds({ days: 1 });
const LOAEventLogger = new LeaveOfAbsenceEventLogger();

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Validate the duration of the LOA.
 * @param Interaction
 * @param DurationParsed
 * @returns A boolean indicating if the duration wasn't valid (true, the interaction was handled) or was (false).
 */
export function HandleDurationValidation(
  Interaction: SlashCommandInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  DurationParsed?: number
) {
  if (!DurationParsed) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDurationExp")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (DurationParsed > MaxDuration) {
    return new ErrorEmbed()
      .useErrTemplate("LOADurationTooLong")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (DurationParsed < MinimumDuration) {
    return new ErrorEmbed()
      .useErrTemplate("LOADurationTooShort")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }
  return false;
}

/**
 * Checks if the requester has recently denied a LOA and if so, handles the interaction accordingly. This is done to prevent abuse of the commands.
 * @param Interaction - The interaction received from the user.
 * @param GuildProfile - The guild profile of the user.
 * @returns A boolean indicating if the interaction was handled (true) or not (false).
 */
async function HasRecentlyDeniedCancelledLOA(Interaction: SlashCommandInteraction<"cached">) {
  const PreviousDCNoticeRequest =
    await UserActivityNoticeModel.aggregate<UserActivityNotice.ActivityNoticeHydratedDocument>([
      {
        $match: {
          user: Interaction.user.id,
          guild: Interaction.guildId,
          status: { $in: ["Denied", "Cancelled"] },
        },
      },
      { $sort: { request_date: -1 } },
      { $limit: 1 },
    ]).then((Results) => Results[0]);

  if (!PreviousDCNoticeRequest) return false;
  if (
    PreviousDCNoticeRequest.status === "Denied" &&
    differenceInHours(Interaction.createdAt, PreviousDCNoticeRequest.request_date) < 3
  ) {
    return new ErrorEmbed()
      .useErrTemplate("LOAPreviouslyDenied")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (
    PreviousDCNoticeRequest.status === "Cancelled" &&
    differenceInHours(
      Interaction.createdAt,
      PreviousDCNoticeRequest.review_date || PreviousDCNoticeRequest.request_date
    ) < 1
  ) {
    return new ErrorEmbed()
      .useErrTemplate("LOAPreviouslyCancelled")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (
    PreviousDCNoticeRequest.is_over &&
    differenceInHours(
      Interaction.createdAt,
      PreviousDCNoticeRequest.early_end_date || PreviousDCNoticeRequest.end_date
    ) < 1
  ) {
    return new ErrorEmbed()
      .useErrTemplate("LOARecentlyEnded")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }

  return false;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  await Interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const ActiveOrPendingNotice = await UserActivityNoticeModel.findOne(
    {
      user: Interaction.user.id,
      guild: Interaction.guildId,
      $or: [
        { status: "Pending", review_date: null },
        {
          status: "Approved",
          early_end_date: null,
          end_date: { $gt: Interaction.createdAt },
        },
      ],
    },
    { status: 1 }
  )
    .lean()
    .exec();

  if (ActiveOrPendingNotice) {
    return new ErrorEmbed()
      .useErrTemplate("UANoticeAlreadyExists", "leave of absence")
      .replyToInteract(Interaction, true, true);
  }

  const RequestReason = Interaction.options.getString("reason", true);
  const RequestDuration = Interaction.options.getString("duration", true);
  const DurationParsed = Math.round(ParseDuration(RequestDuration, "millisecond") ?? 0);
  if (await HandleDurationValidation(Interaction, DurationParsed)) return;
  if (await HasRecentlyDeniedCancelledLOA(Interaction)) return;

  const PendingLeave = await UserActivityNoticeModel.create({
    type: "LeaveOfAbsence",
    user: Interaction.user.id,
    guild: Interaction.guildId,
    status: "Pending",
    reason: RequestReason,
    duration: DurationParsed,
    request_date: Interaction.createdAt,
  });

  const RequestMsg = await LOAEventLogger.SendRequest(Interaction, PendingLeave);
  if (RequestMsg) {
    PendingLeave.request_msg = `${RequestMsg.channelId}:${RequestMsg.id}`;
  }

  return Promise.all([
    PendingLeave.save(),
    new InfoEmbed()
      .setTitle("Leave of Absence Requested")
      .setDescription(
        "Your request for leave of absence has been forwarded to the management staff for approval. If approved within the same day, " +
          `your LOA will expire around ${FormatTime(PendingLeave.end_date, "D")} and you will be notified via DMs (if possible) whenever there is an update regarding its status.\n` +
          `-# To cancel the pending request, you may use the ${MentionCmdByName("loa manage")} command.`
      )
      .replyToInteract(Interaction, true),
  ]);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("request")
    .setDescription("Request a leave of absence for a certain duration.")
    .addStringOption((Option) =>
      Option.setName("duration")
        .setDescription(
          "Specify the LOA duration from the approval date (e.g., '1 week'). Maximum duration is 3 months."
        )
        .setMinLength(2)
        .setMaxLength(32)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("reason")
        .setDescription("Reason for the leave of absence request.")
        .setMinLength(5)
        .setMaxLength(312)
        .setRequired(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
