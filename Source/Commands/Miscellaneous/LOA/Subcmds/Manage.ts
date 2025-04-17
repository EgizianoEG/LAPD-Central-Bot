import {
  SlashCommandSubcommandBuilder,
  time as FormatTime,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ComponentType,
  EmbedBuilder,
  Message,
  ButtonStyle,
  userMention,
  ModalBuilder,
  MessageFlags,
  TextInputStyle,
  TextInputBuilder,
  ModalSubmitInteraction,
  InteractionCollector,
} from "discord.js";

import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { Embeds, Emojis } from "@Config/Shared.js";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { GetErrorId, RandomString } from "@Utilities/Strings/Random.js";
import { LeaveOfAbsenceEventLogger } from "@Utilities/Classes/UANEventLogger.js";
import { milliseconds, compareDesc, addMilliseconds } from "date-fns";

import HandleLeaveRoleAssignment from "@Utilities/Other/HandleLeaveRoleAssignment.js";
import LeaveOfAbsenceModel from "@Models/UserActivityNotice.js";
import MentionCmdByName from "@Utilities/Other/MentionCmd.js";
import ParseDuration from "parse-duration";
import GetLOAsData from "@Utilities/Database/GetUANData.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Dedent from "dedent";

const PreviousLOAsLimit = 5;
const LOAEventLogger = new LeaveOfAbsenceEventLogger();
const MinExtDuration = milliseconds({ hours: 12 });
const MaxExtDuration = milliseconds({ months: 1 });
const FileLabel = "Commands:Miscellaneous:LOA:Subcmds:Manage";
const ExtReqDurationExamples = ["1d, 12h", "12 hours", "1w", "4 days"];
const ExtReqReasonExamples = [
  "same reason, longer duration.",
  "extending for the same reason.",
  "unresolved travel delays persist.",
  "reason unchanged, time extended.",
];

type LOADocument = UserActivityNotice.ActivityNoticeHydratedDocument;
type PromptInteractType =
  | ButtonInteraction<"cached">
  | ModalSubmitInteraction<"cached">
  | SlashCommandInteraction<"cached">;

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Validate the duration of the LOA extension request.
 * @param Interaction
 * @param ActiveLOA
 * @param DurationParsed
 * @returns A boolean indicating if the duration wasn't valid (true, the interaction was handled) or was (false).
 */
export function ValidateExtendedDuration(
  Interaction: ModalSubmitInteraction<"cached">,
  ActiveLOA: LOADocument,
  DurationParsed?: number
) {
  const TotalLOADuration = ActiveLOA.duration + (ActiveLOA.extension_request?.duration ?? 0);
  if (!DurationParsed) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDurationExp")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (DurationParsed > MaxExtDuration) {
    return new ErrorEmbed()
      .useErrTemplate("LOAExtDurationTooLong")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (DurationParsed < MinExtDuration) {
    return new ErrorEmbed()
      .useErrTemplate("LOAExtDurationTooShort")
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if (TotalLOADuration > milliseconds({ months: 4 })) {
    return new ErrorEmbed()
      .useErrTemplate("LOATotalDurationTooLong")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }
  return false;
}

function GetManagementComponents(
  Interaction: PromptInteractType,
  LeaveDocument?: LOADocument | null
) {
  const ActionRow = new ActionRowBuilder<ButtonBuilder>();
  const LOACancelBtn = new ButtonBuilder()
    .setCustomId("loa-mng-cancel")
    .setStyle(ButtonStyle.Danger)
    .setEmoji(Emojis.WhiteCross)
    .setLabel("Cancel Leave Request");

  const LOAExtCancelBtn = new ButtonBuilder()
    .setCustomId("loa-mng-ext-cancel")
    .setStyle(ButtonStyle.Danger)
    .setEmoji(Emojis.WhiteCross)
    .setLabel("Cancel Extension Request");

  const LOAEndBtn = new ButtonBuilder()
    .setCustomId("loa-mng-end")
    .setStyle(ButtonStyle.Danger)
    .setEmoji(Emojis.MediaStop)
    .setDisabled(LeaveDocument?.is_manageable !== true)
    .setLabel("End Early");

  const LOAExtendBtn = new ButtonBuilder()
    .setDisabled(Boolean(LeaveDocument?.extension_request))
    .setCustomId("loa-mng-extend")
    .setStyle(ButtonStyle.Success)
    .setEmoji(Emojis.WhitePlus)
    .setDisabled(LeaveDocument?.is_manageable !== true || LeaveDocument?.extension_request !== null)
    .setLabel("Request Leave Extension");

  if (LeaveDocument?.status === "Pending") {
    ActionRow.addComponents(LOACancelBtn);
  } else if (LeaveDocument?.is_active && LeaveDocument.extension_request?.status === "Pending") {
    ActionRow.addComponents(LOAExtCancelBtn, LOAEndBtn);
  } else {
    ActionRow.addComponents(LOAExtendBtn, LOAEndBtn);
  }

  return !LeaveDocument ||
    (LeaveDocument.status === "Approved" && LeaveDocument.end_date < Interaction.createdAt)
    ? []
    : [ActionRow];
}

async function GetManagementEmbedAndLOA(Interaction: PromptInteractType) {
  const LOAData = await GetLOAsData({
    guild_id: Interaction.guildId,
    user_id: Interaction.user.id,
    type: "LeaveOfAbsence",
  });

  const ActiveOrPendingLOA = LOAData.active_notice ?? LOAData.pending_notice;
  const ReplyEmbed = new EmbedBuilder()
    .setTitle("Leave of Absence Management")
    .setColor(Embeds.Colors.Info);

  const PreviousLOAsFormatted = LOAData.notice_history
    .filter((LOA) => {
      return (
        LOA.status === "Approved" && (LOA.early_end_date ?? LOA.end_date) <= Interaction.createdAt
      );
    })
    .sort((a, b) => compareDesc(a.early_end_date ?? a.end_date, b.early_end_date ?? b.end_date))
    .map((LOA) => {
      return `${FormatTime(LOA.review_date!, "D")} — ${FormatTime(LOA.early_end_date ?? LOA.end_date, "D")}`;
    });

  if (ActiveOrPendingLOA?.reviewed_by && ActiveOrPendingLOA.is_active) {
    ReplyEmbed.setColor(Embeds.Colors.LOARequestApproved).addFields({
      inline: true,
      name: "Active Leave" + (ActiveOrPendingLOA.is_manageable === true ? "" : " (Unmanageable)"),
      value: Dedent(`
        **Started:** ${FormatTime(ActiveOrPendingLOA.review_date!, "D")}
        **Ends On:** ${FormatTime(ActiveOrPendingLOA.end_date, "D")}
        **Duration:** ${ActiveOrPendingLOA.duration_hr}
        **Approved By:** ${userMention(ActiveOrPendingLOA.reviewed_by.id)}
        **Reason:** ${ActiveOrPendingLOA.reason}
      `),
    });
  } else if (ActiveOrPendingLOA?.status === "Pending") {
    ReplyEmbed.setColor(Embeds.Colors.LOARequestPending).addFields({
      inline: true,
      name: "Pending Leave",
      value: Dedent(`
        **Requested:** ${FormatTime(ActiveOrPendingLOA.request_date, "R")}
        **Starts On:** *once approved.*
        **Ends On:** around ${FormatTime(addMilliseconds(Interaction.createdAt, ActiveOrPendingLOA.duration), "d")}
        **Duration:** ${ActiveOrPendingLOA.duration_hr}
        **Reason:** ${ActiveOrPendingLOA.reason}
      `),
    });
  } else {
    ReplyEmbed.setDescription(
      `You currently do not have an active or pending leave to manage.\nYou may request one using the ${MentionCmdByName("loa request")} command.`
    );
  }

  const HasPendingExtension =
    ActiveOrPendingLOA?.is_active && ActiveOrPendingLOA.extension_request?.status === "Pending";
  if (HasPendingExtension) {
    ReplyEmbed.setColor(Embeds.Colors.LOARequestPending).addFields({
      inline: true,
      name: "Pending Extension",
      value: Dedent(`
        **Requested:** ${FormatTime(ActiveOrPendingLOA.extension_request!.date, "R")}
        **Duration:** ${ActiveOrPendingLOA.extended_duration_hr}
        **LOA Ends:** after extension, ${FormatTime(addMilliseconds(ActiveOrPendingLOA.end_date, ActiveOrPendingLOA.extension_request!.duration), "d")}
        **Reason:** ${ActiveOrPendingLOA.extension_request!.reason ?? "`N/A`"}
      `),
    });
  }

  if (PreviousLOAsFormatted.length > 0 && PreviousLOAsFormatted.length <= PreviousLOAsLimit) {
    ReplyEmbed.addFields({
      inline: !HasPendingExtension,
      name: "Previously Taken LOAs",
      value: PreviousLOAsFormatted.join("\n"),
    });
  } else if (PreviousLOAsFormatted.length > PreviousLOAsLimit) {
    ReplyEmbed.addFields({
      inline: !HasPendingExtension,
      name: "Previously Taken LOAs",
      value: `${PreviousLOAsFormatted.slice(0, PreviousLOAsLimit).join("\n")}\n-# *...and ${PreviousLOAsFormatted.length - PreviousLOAsLimit} more*`,
    });
  } else if (!(ReplyEmbed.data.fields?.length && ActiveOrPendingLOA)) {
    ReplyEmbed.setDescription(
      `${ReplyEmbed.data.description}\n-# There are no previously approved LOAs to display.`
    );
  }

  return [ReplyEmbed, ActiveOrPendingLOA] as const;
}

async function HandleLeaveExtend(
  Interaction: ButtonInteraction<"cached">,
  CompCollector: InteractionCollector<ButtonInteraction<"cached">>,
  MainPromptMsgId: string
) {
  let ActiveLeave = await LeaveOfAbsenceModel.findOne({
    guild: Interaction.guildId,
    user: Interaction.user.id,
    status: "Approved",
    early_end_date: null,
    end_date: { $gt: Interaction.createdAt },
  });

  if (!ActiveLeave) {
    return Promise.allSettled([
      new ErrorEmbed().useErrTemplate("LOAIsOverForExtension").replyToInteract(Interaction, true),
      Callback(Interaction, MainPromptMsgId),
      CompCollector.stop("Updated"),
    ]);
  }

  if (ActiveLeave.extension_request) {
    return Promise.allSettled([
      new ErrorEmbed()
        .useErrTemplate("LOAExtensionLimitReached")
        .replyToInteract(Interaction, true),
      Callback(Interaction, MainPromptMsgId),
      CompCollector.stop("Updated"),
    ]);
  }

  const UniqueID = RandomString(4);
  const ERDurationText =
    ExtReqDurationExamples[Math.floor(Math.random() * ExtReqDurationExamples.length)];
  const ERReasonText =
    ExtReqReasonExamples[Math.floor(Math.random() * ExtReqReasonExamples.length)];

  const ExtendModal = new ModalBuilder()
    .setTitle("Leave of Absence Extension Request")
    .setCustomId(`loa-extend-modal:${Interaction.user.id}:${UniqueID}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setLabel("Extension Duration")
          .setCustomId("ext-duration")
          .setPlaceholder(`e.g. ${ERDurationText}`)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(64)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setLabel("Extension Reason")
          .setCustomId("ext-reason")
          .setPlaceholder(`e.g. ${ERReasonText}`)
          .setMinLength(6)
          .setMaxLength(332)
          .setRequired(true)
      )
    );

  await Interaction.showModal(ExtendModal);
  await Interaction.awaitModalSubmit({
    time: 5 * 60_000,
    filter: (i) => i.customId === `loa-extend-modal:${Interaction.user.id}:${UniqueID}`,
  })
    .then(async (Submission) => {
      ActiveLeave = await ActiveLeave!.getUpToDate();
      const Duration = Submission.fields.getTextInputValue("ext-duration");
      const Reason = Submission.fields.getTextInputValue("ext-reason") || null;
      const ParsedDuration = Math.round(ParseDuration(Duration, "millisecond") ?? 0);
      const SubmissionHandled = ValidateExtendedDuration(Submission, ActiveLeave, ParsedDuration);

      if (SubmissionHandled) return;
      if (!ActiveLeave.is_active) {
        return Promise.all([
          new ErrorEmbed().useErrTemplate("LOANotActive").replyToInteract(Submission, true),
          Callback(Submission, MainPromptMsgId),
          CompCollector.stop("Updated"),
        ]);
      } else if (ActiveLeave.extension_request) {
        return Promise.all([
          new ErrorEmbed()
            .useErrTemplate("LOAExtensionLimitReached")
            .replyToInteract(Submission, true),
          Callback(Submission, MainPromptMsgId),
          CompCollector.stop("Updated"),
        ]);
      }

      Submission.deferReply({ flags: MessageFlags.Ephemeral });
      ActiveLeave.extension_request = {
        status: "Pending",
        date: Submission.createdAt,
        reason: Reason,
        duration: ParsedDuration,
      };

      const RequestMsg = await LOAEventLogger.SendExtensionRequest(Submission, ActiveLeave);
      const ReplyEmbed = new EmbedBuilder()
        .setColor(Embeds.Colors.Success)
        .setTitle("Leave Extension Requested")
        .setDescription(
          "Successfully submitted leave extension request. You will be notified when the request is approved or denied via a DM notice if possible."
        );

      ActiveLeave.extension_request.request_msg = RequestMsg
        ? `${RequestMsg.channelId}:${RequestMsg.id}`
        : null;

      await ActiveLeave.save();
      return Promise.allSettled([
        Submission.editReply({ embeds: [ReplyEmbed] }),
        Callback(Submission, MainPromptMsgId),
        CompCollector.stop("Updated"),
      ]);
    })
    .catch((Err: any) => {
      if (!(Err instanceof Error && Err.message.match(/reason: (?:time|idle)/))) {
        throw Err;
      }
    });
}

async function HandleLeaveEarlyEnd(
  Interaction: ButtonInteraction<"cached">,
  CompCollector: InteractionCollector<ButtonInteraction<"cached">>,
  MainPromptMsgId: string
) {
  let ActiveLeave = await LeaveOfAbsenceModel.findOne({
    guild: Interaction.guildId,
    user: Interaction.user.id,
    status: "Approved",
    early_end_date: null,
    end_date: { $gt: Interaction.createdAt },
  });

  if (!ActiveLeave) {
    return Promise.all([
      CompCollector.stop("Updated"),
      Callback(Interaction, MainPromptMsgId),
      new ErrorEmbed().useErrTemplate("LOANotActive").replyToInteract(Interaction, true),
    ]);
  }

  const ConfirmationEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Warning)
    .setTitle("Leave of Absence Early Termination")
    .setDescription(
      Dedent(`
        **Are you sure you want to terminate your active leave early**
        Please keep in mind that once confirmed, you will be unable to request a new leave for the next hour.
      `)
    );

  const ConfirmationBtns = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("loa-end-confirm")
      .setStyle(ButtonStyle.Success)
      .setLabel("Yes, End Leave"),
    new ButtonBuilder()
      .setCustomId("loa-end-cancel")
      .setStyle(ButtonStyle.Danger)
      .setLabel("No, Cancel")
  );

  const ConfirmationMsg = await Interaction.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationBtns],
    flags: MessageFlags.Ephemeral,
    withResponse: true,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  const ButtonInteract = await ConfirmationMsg.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === Interaction.user.id,
    time: 5 * 60_000,
  }).catch(() => null);

  const UnchangedLeaveEmbed = new InfoEmbed()
    .setThumbnail(null)
    .setTitle("Leave Early Termination")
    .setDescription(
      "Your leave of absence has not been changed." +
        (ButtonInteract?.customId.includes("cancel") ? "" : " Prompt timed out.")
    );

  if (!ButtonInteract) {
    return Interaction.editReply({
      embeds: [UnchangedLeaveEmbed],
      components: [],
    });
  } else if (ButtonInteract.customId.includes("cancel")) {
    return ButtonInteract.update({
      embeds: [UnchangedLeaveEmbed],
      components: [],
    });
  }

  ActiveLeave = await ActiveLeave.getUpToDate();
  if (!ActiveLeave.is_active) {
    return Promise.allSettled([
      Callback(ButtonInteract, MainPromptMsgId),
      CompCollector.stop("Updated"),
      ButtonInteract.editReply({
        components: [],
        embeds: [
          new ErrorEmbed()
            .setThumbnail(null)
            .useErrTemplate("LOAAlreadyEnded")
            .setTitle("Leave Early Termination"),
        ],
      }),
    ]);
  }

  ActiveLeave.early_end_date = ButtonInteract.createdAt;
  ActiveLeave.end_processed = true;
  await ActiveLeave.save();

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave of Absence Terminated")
    .setDescription("Your leave of absence has been successfully terminated at your request.");

  await ButtonInteract.update({ embeds: [ReplyEmbed], components: [] }).catch(() => null);
  return Promise.allSettled([
    CompCollector.stop("Updated"),
    Callback(ButtonInteract, MainPromptMsgId),
    LOAEventLogger.LogEarlyUANEnd(ButtonInteract, ActiveLeave, "Requester"),
    HandleLeaveRoleAssignment(ActiveLeave.user, ButtonInteract.guild, false),
  ]);
}

async function HandlePendingLeaveCancellation(
  Interaction: ButtonInteraction<"cached">,
  CompCollector: InteractionCollector<ButtonInteraction<"cached">>,
  MainPromptMsgId: string
) {
  const PendingLeave = await LeaveOfAbsenceModel.findOne({
    guild: Interaction.guildId,
    user: Interaction.user.id,
    status: "Pending",
  });

  if (!PendingLeave) {
    return Promise.allSettled([
      new ErrorEmbed().useErrTemplate("NoPendingLOAToCancel").replyToInteract(Interaction, true),
      Callback(Interaction, MainPromptMsgId),
      CompCollector.stop("Updated"),
    ]);
  }

  const ConfirmationEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Warning)
    .setTitle("Leave of Absence Cancellation")
    .setDescription(
      Dedent(`
        **Are you sure you want to cancel your leave request?**
        You will not be able to request another leave for the next hour if you proceed.
      `)
    );

  const ConfirmationBtns = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("loa-cancel-confirm")
      .setStyle(ButtonStyle.Danger)
      .setLabel("Yes, Cancel Request"),
    new ButtonBuilder()
      .setCustomId("loa-cancel-keep")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("No, Keep It")
  );

  const ConfirmationMsg = await Interaction.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationBtns],
    flags: MessageFlags.Ephemeral,
    withResponse: true,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  const ButtonInteract = await ConfirmationMsg.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === Interaction.user.id,
    time: 8 * 60_000,
  }).catch(() => null);

  if (!ButtonInteract || ButtonInteract.customId === "loa-cancel-keep") {
    return Interaction.deleteReply().catch(() => null);
  }

  await ButtonInteract.deferUpdate();
  if (await HandleLeaveReviewValidation(ButtonInteract, await PendingLeave.getUpToDate())) {
    CompCollector.stop("Updated");
    return Callback(ButtonInteract, MainPromptMsgId);
  }

  PendingLeave.status = "Cancelled";
  PendingLeave.review_date = ButtonInteract.createdAt;
  await PendingLeave.save();

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Request Cancelled")
    .setDescription("Your leave request was successfully cancelled at your request.");

  return Promise.allSettled([
    CompCollector.stop("Updated"),
    Callback(ButtonInteract, MainPromptMsgId),
    LOAEventLogger.LogCancellation(ButtonInteract, PendingLeave),
    ButtonInteract.editReply({ embeds: [ReplyEmbed], components: [] }),
  ]);
}

async function HandlePendingExtensionCancellation(
  Interaction: ButtonInteraction<"cached">,
  CompCollector: InteractionCollector<ButtonInteraction<"cached">>,
  MainPromptMsgId: string
) {
  let ActiveLeave = await LeaveOfAbsenceModel.findOne({
    guild: Interaction.guildId,
    user: Interaction.user.id,
    status: "Approved",
    early_end_date: null,
    end_date: { $gt: Interaction.createdAt },
  });

  if (!ActiveLeave) {
    return Promise.allSettled([
      new ErrorEmbed().useErrTemplate("LOANotActive").replyToInteract(Interaction, true),
      Callback(Interaction, MainPromptMsgId),
      CompCollector.stop("Updated"),
    ]);
  }

  const ConfirmationEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Warning)
    .setTitle("Extension Cancellation")
    .setDescription(
      Dedent(`
        **Are you sure you want to cancel your leave extension request?**
        You will not be able to request another any other extension for this leave if you proceed.
      `)
    );

  const ConfirmationBtns = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("loa-ext-cancel-confirm")
      .setStyle(ButtonStyle.Danger)
      .setLabel("Yes, Cancel Request"),
    new ButtonBuilder()
      .setCustomId("loa-ext-cancel-keep")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("No, Keep It")
  );

  const ConfirmationMsg = await Interaction.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationBtns],
    flags: MessageFlags.Ephemeral,
    withResponse: true,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  const ButtonInteract = await ConfirmationMsg.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === Interaction.user.id,
    time: 8 * 60_000,
  }).catch(() => null);

  if (!ButtonInteract || ButtonInteract.customId === "loa-ext-cancel-keep") {
    return Interaction.deleteReply().catch(() => null);
  }

  ActiveLeave = await ActiveLeave.getUpToDate();
  await ButtonInteract.deferUpdate();
  if (await HandleLeaveReviewValidation(ButtonInteract, ActiveLeave)) {
    return ConfirmationMsg.delete()
      .catch(() => Interaction.deleteReply())
      .catch(() => null);
  }

  ActiveLeave.extension_request!.status = "Cancelled";
  ActiveLeave.extension_request!.review_date = ButtonInteract.createdAt;
  await ActiveLeave.save();

  const SuccessCancellationEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Extension Request Cancelled")
    .setDescription("Your LOA extension request was successfully cancelled.");

  return Promise.allSettled([
    CompCollector.stop("Updated"),
    Callback(ButtonInteract, MainPromptMsgId),
    LOAEventLogger.LogExtensionCancellation(Interaction, ActiveLeave),
    Interaction.editReply({ embeds: [SuccessCancellationEmbed], components: [] }),
  ]);
}

async function HandleLeaveReviewValidation(
  Interaction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  RequestDocument?: UserActivityNotice.ActivityNoticeHydratedDocument | null
): Promise<boolean> {
  const RequestHasToBeReviewed =
    (RequestDocument?.status === "Pending" && RequestDocument?.review_date === null) ||
    (RequestDocument?.status === "Approved" &&
      RequestDocument?.early_end_date === null &&
      RequestDocument?.extension_request?.status === "Pending");

  if (!RequestHasToBeReviewed) {
    return new ErrorEmbed()
      .setTitle("Leave of Absence Modified")
      .setDescription(
        "The request/leave you are taking action on either does not exist or has been modified."
      )
      .replyToInteract(Interaction, true, true, "editReply")
      .then(() => true);
  }

  return false;
}

// ---------------------------------------------------------------------------------------
// Initial Handling:
// -----------------
async function Callback(Interaction: PromptInteractType, CmdInteractReplyMsgId?: string) {
  if (!Interaction.replied && !Interaction.deferred)
    await Interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);

  const [ReplyEmbed, ActiveOrPendingLOA] = await GetManagementEmbedAndLOA(Interaction);
  const ManagementComps = GetManagementComponents(Interaction, ActiveOrPendingLOA);
  const ReplyMsg = await Interaction.editReply({
    embeds: [ReplyEmbed],
    message: CmdInteractReplyMsgId,
    components: ManagementComps,
  }).catch(() => null);

  if (!ReplyMsg || !ActiveOrPendingLOA) return;
  CmdInteractReplyMsgId = CmdInteractReplyMsgId ?? ReplyMsg.id;
  const CompActionCollector = ReplyMsg.createMessageComponentCollector({
    filter: (ButtonInteract) => ButtonInteract.user.id === Interaction.user.id,
    componentType: ComponentType.Button,
    time: 10 * 60_000,
  });

  CompActionCollector.on("collect", async (ButtonInteract) => {
    try {
      const [UpdatedInfoEmbed, ActivePendingLOA] = await GetManagementEmbedAndLOA(Interaction);
      if (!ActivePendingLOA) {
        CompActionCollector.stop("Updated");
        return new ErrorEmbed()
          .useErrTemplate("LOANotActive")
          .replyToInteract(ButtonInteract, true)
          .then(() => {
            ButtonInteract.editReply({
              message: CmdInteractReplyMsgId,
              embeds: [UpdatedInfoEmbed],
              components: [],
            });
          });
      }

      if (ButtonInteract.customId === "loa-mng-end") {
        await HandleLeaveEarlyEnd(ButtonInteract, CompActionCollector, CmdInteractReplyMsgId);
      } else if (ButtonInteract.customId === "loa-mng-extend") {
        await HandleLeaveExtend(ButtonInteract, CompActionCollector, CmdInteractReplyMsgId);
      } else if (ButtonInteract.customId === "loa-mng-cancel") {
        await HandlePendingLeaveCancellation(
          ButtonInteract,
          CompActionCollector,
          CmdInteractReplyMsgId
        );
      } else if (ButtonInteract.customId === "loa-mng-ext-cancel") {
        await HandlePendingExtensionCancellation(
          ButtonInteract,
          CompActionCollector,
          CmdInteractReplyMsgId
        );
      } else {
        await ButtonInteract.deferUpdate();
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      AppLogger.error({
        message: "An error occurred while handling button interaction;",
        label: FileLabel,
        error_id: ErrorId,
        stack: Err.stack,
      });

      return new ErrorEmbed()
        .setErrorId(ErrorId)
        .setTitle("Error")
        .setDescription("Something went wrong while handling your request.")
        .replyToInteract(ButtonInteract, true, true, "followUp");
    }
  });

  CompActionCollector.on("end", async (Collected, EndReason: string) => {
    if (EndReason === "Updated" || EndReason.match(/^\w+Delete/)) return;
    try {
      ManagementComps[0].components.forEach((Btn) => Btn.setDisabled(true));
      const LastInteract = Collected.last();
      if (LastInteract) {
        await LastInteract.editReply({
          components: ManagementComps,
          message: CmdInteractReplyMsgId,
        });
      } else {
        await Interaction.editReply({ components: ManagementComps });
      }
    } catch (Err: any) {
      AppLogger.error({
        message: "An error occurred while ending the component collector for LOA management;",
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });
}

// ---------------------------------------------------------------------------------------
// Command Structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("manage")
    .setDescription("Manage and control an active or pending leave of absence, if one exists."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
