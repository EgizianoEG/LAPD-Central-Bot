import {
  SlashCommandSubcommandBuilder,
  ModalSubmitInteraction,
  time as FormatTime,
  MessageFlags,
} from "discord.js";

import { ReducedActivityEventLogger } from "@Utilities/Classes/UANEventLogger.js";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { differenceInHours } from "date-fns";
import { milliseconds } from "date-fns/milliseconds";

import UserActivityNoticeModel from "@Models/UserActivityNotice.js";
import MentionCmdByName from "@Utilities/Other/MentionCmd.js";
import ParseDuration from "parse-duration";

const MaxDuration = milliseconds({ months: 1 });
const MinimumDuration = milliseconds({ days: 1 });
const RAEventLogger = new ReducedActivityEventLogger();

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Validate the duration of the RA.
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
      .useErrTemplate("RADurationTooLong")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (DurationParsed < MinimumDuration) {
    return new ErrorEmbed()
      .useErrTemplate("RADurationTooShort")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }
  return false;
}

/**
 * Checks if the requester has recently denied or cancelled an RA and handles the interaction accordingly.
 * @param Interaction - The interaction received from the user.
 * @returns A boolean indicating if the interaction was handled (true) or not (false).
 */
async function HasRecentlyDeniedCancelledRA(Interaction: SlashCommandInteraction<"cached">) {
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
      .useErrTemplate("RAPreviouslyDenied")
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
      .useErrTemplate("RAPreviouslyCancelled")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }

  return false;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  await Interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const ActiveOrPendingRA = await UserActivityNoticeModel.findOne(
    {
      user: Interaction.user.id,
      guild: Interaction.guildId,
      type: "ReducedActivity",
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

  if (ActiveOrPendingRA) {
    return new ErrorEmbed()
      .useErrTemplate("UANoticeAlreadyExists", "reduced activity")
      .replyToInteract(Interaction, true, true);
  }

  const RequestReason = Interaction.options.getString("reason", true);
  const RequestDuration = Interaction.options.getString("duration", true);
  const DurationParsed = Math.round(ParseDuration(RequestDuration, "millisecond") ?? 0);
  if (await HandleDurationValidation(Interaction, DurationParsed)) return;
  if (await HasRecentlyDeniedCancelledRA(Interaction)) return;

  const PendingRA = await UserActivityNoticeModel.create({
    type: "ReducedActivity",
    user: Interaction.user.id,
    guild: Interaction.guildId,
    status: "Pending",
    reason: RequestReason,
    duration: DurationParsed,
    request_date: Interaction.createdAt,
    quota_scale: Interaction.options.getInteger("quota_reduction", true) / 100,
  });

  const RequestMsg = await RAEventLogger.SendRequest(Interaction, PendingRA);
  if (RequestMsg) {
    PendingRA.request_msg = `${RequestMsg.channelId}:${RequestMsg.id}`;
  }

  return Promise.all([
    PendingRA.save(),
    new InfoEmbed()
      .setTitle("Reduced Activity Requested")
      .setDescription(
        "Your request for reduced activity has been forwarded to the management staff for approval. If approved within the same day, " +
          `your RA will expire around ${FormatTime(PendingRA.end_date, "D")} and you will be notified via DMs (if possible) whenever there is an update regarding its status.\n` +
          `-# To cancel the pending request, you may use the ${MentionCmdByName("ra manage")} command.`
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
    .setDescription("Request reduced activity for a certain duration.")
    .addStringOption((Option) =>
      Option.setName("duration")
        .setDescription(
          "Specify the RA duration from the approval date (e.g., '1 week'). Maximum duration is 1 month."
        )
        .setMinLength(2)
        .setMaxLength(32)
        .setRequired(true)
    )
    .addIntegerOption((Option) =>
      Option.setName("quota_reduction")
        .setDescription("The percentage of quota reduction requested, ranging from 20% to 75%.")
        .setMinValue(20)
        .setMaxValue(75)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("reason")
        .setDescription("Reason for the reduced activity request.")
        .setMinLength(5)
        .setMaxLength(312)
        .setRequired(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
