/* eslint-disable sonarjs/no-duplicate-string */
import {
  ModalSubmitInteraction,
  createComponentBuilder,
  time as FormatTime,
  ButtonInteraction,
  TextInputBuilder,
  ActionRowBuilder,
  BaseInteraction,
  TextInputStyle,
  EmbedBuilder,
  ModalBuilder,
  MessageFlags,
} from "discord.js";

import {
  LeaveOfAbsenceEventLogger,
  ReducedActivityEventLogger,
} from "@Utilities/Classes/UANEventLogger.js";

import { Embeds } from "@Config/Shared.js";
import { UserHasPermsV2 } from "@Utilities/Database/UserHasPermissions.js";
import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { GetErrorId, RandomString } from "@Utilities/Strings/Random.js";
import { ErrorEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleUserActivityNoticeRoleAssignment from "@Utilities/Other/HandleUANRoleAssignment.js";
import LeaveOfAbsenceModel from "@Models/UserActivityNotice.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import GetUANsData from "@Utilities/Database/GetUANData.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Dedent from "dedent";

type HNoticeDocument = UserActivityNotice.ActivityNoticeHydratedDocument;
const LOAEventLogger = new LeaveOfAbsenceEventLogger();
const RAEventLogger = new ReducedActivityEventLogger();

// Function maps for both LOA and RA handlers
const FunctionMap = {
  "loa-approve": HandleUANApproval,
  "loa-deny": HandleUANDenial,
  "loa-info": HandleNoticeAddInfo,
  "loa-ext-approve": HandleExtApproval,
  "loa-ext-deny": HandleExtDenial,

  "ra-approve": HandleUANApproval,
  "ra-deny": HandleUANDenial,
  "ra-info": HandleNoticeAddInfo,
};

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles all User Activity Notice management button interactions.
 * @param _ - Discord client instance (unused parameter).
 * @param Interaction - The Discord interaction to process.
 * @returns A Promise that resolves when the interaction handling is complete, or undefined if the interaction doesn't match criteria.
 */
export default async function UANManagementHandlerWrapper(
  _: DiscordClient,
  Interaction: BaseInteraction
) {
  if (
    !Interaction.isButton() ||
    !Interaction.inCachedGuild() ||
    !Interaction.customId.match(/^(?:loa|ra)-(?:ext-)?(?:app|den|inf)[\w-]*:/)
  ) {
    return;
  }

  try {
    if (await HandleUnauthorizedManagement(Interaction)) return;
    await UANManagementHandler(Interaction);
  } catch (Err: any) {
    const ErrorId = GetErrorId();
    AppLogger.error({
      label: "Events:InteractionCreate:UANManagementHandler.ts",
      message: "Failed to handle UAN management button interaction;",
      error_id: ErrorId,
      stack: Err.stack,
    });

    return new ErrorEmbed()
      .useErrTemplate("UnknownError")
      .setErrorId(ErrorId)
      .replyToInteract(Interaction, true);
  }
}

/**
 * Processes User Activity Notice management actions from button interactions.
 * Button custom id format: <type>-<action>:<requester_id>:<request_id/notice_id>
 * - Types: `loa` for Leave of Absence or `ra` for Reduced Activity
 * - Actions: `approve`, `deny`, `info`, `ext-approve`, `ext-deny` (ext actions only for LOA)
 * - The `request_id` is the unique ID of the UAN request stored in the database.
 *
 * @param Interaction - The button interaction to process.
 * @returns A Promise that resolves when the management action is completed.
 */
async function UANManagementHandler(Interaction: ButtonInteraction<"cached">) {
  const [Action, , NoticeId] = Interaction.customId.split(":");
  const RequestDocument = await LeaveOfAbsenceModel.findById(NoticeId).exec();
  if (await HandleNoticeReviewValidation(Interaction, RequestDocument)) return;
  return FunctionMap[Action](Interaction, RequestDocument);
}

/**
 * Validates if the user has management permissions to perform UAN management actions.
 * @param Interaction - The button interaction to validate permissions for.
 * @returns A Promise resolving to true if user is unauthorized (action blocked), false otherwise.
 */
async function HandleUnauthorizedManagement(Interaction: ButtonInteraction<"cached">) {
  const IsActionAuthorized = await UserHasPermsV2(Interaction.user.id, Interaction.guildId, {
    management: true,
  });

  if (!IsActionAuthorized) {
    return new UnauthorizedEmbed()
      .useErrTemplate("UANUnauthorizedManagement")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }

  return false;
}

/**
 * Validates whether a notice can still be reviewed or has already been processed.
 * @param Interaction - The current interaction being processed.
 * @param RequestDocument - The notice document to validate.
 * @param InitialInteraction - The original button interaction that started the process.
 * @returns A Promise resolving to true if validation failed (action blocked), false if review can proceed.
 */
async function HandleNoticeReviewValidation(
  Interaction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  RequestDocument?: HNoticeDocument | null,
  InitialInteraction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached"> = Interaction
): Promise<boolean> {
  const IsLOA = RequestDocument?.type === "LeaveOfAbsence";
  const IsExtensionRequest =
    IsLOA && RequestDocument?.status !== "Pending" && RequestDocument.extension_request;
  const RequestHasToBeReviewed =
    (RequestDocument?.status === "Pending" && RequestDocument.review_date === null) ||
    (IsLOA && RequestDocument.is_active && RequestDocument.extension_request?.status === "Pending");

  if (!RequestHasToBeReviewed) {
    let UpdatedReqEmbed: EmbedBuilder | null = null;
    const ReplyEmbed = new EmbedBuilder()
      .setColor(Embeds.Colors.Error)
      .setTitle("Request Modified")
      .setDescription(
        "The request you are taking action on either does not exist or has already been reviewed."
      );

    const EventLogger = IsLOA ? LOAEventLogger : RAEventLogger;
    if (RequestDocument && IsExtensionRequest) {
      UpdatedReqEmbed = await LOAEventLogger.GetLOAExtRequestMessageEmbedWithStatus(
        Interaction.guild,
        RequestDocument,
        RequestDocument.extension_request!.status
      );
    } else if (RequestDocument) {
      UpdatedReqEmbed = await EventLogger.GetRequestMessageEmbedWithStatus(
        Interaction.guild,
        RequestDocument,
        RequestDocument.status
      );
    }

    const Tasks: Promise<any>[] = [
      Interaction.deferred || Interaction.replied
        ? Interaction.editReply({ embeds: [ReplyEmbed] })
        : Interaction.reply({ embeds: [ReplyEmbed], flags: MessageFlags.Ephemeral }),
    ];

    if (UpdatedReqEmbed) {
      Tasks.push(
        InitialInteraction.editReply({
          embeds: [UpdatedReqEmbed],
          message: RequestDocument?.request_msg?.split(":")[1],
          components: GetDisabledMessageComponents(InitialInteraction),
        })
      );
    }

    return Promise.all(Tasks)
      .catch(() => true)
      .then(() => true);
  }

  return false;
}

/**
 * Displays additional information about the requester, including their UAN history and shift statistics.
 * @param Interaction - The button interaction requesting additional information.
 * @param NoticeDocument - The notice document for which to display information.
 * @returns A Promise that resolves after sending the information response.
 */
async function HandleNoticeAddInfo(
  Interaction: ButtonInteraction<"cached">,
  NoticeDocument: HNoticeDocument
) {
  const IsLOA = NoticeDocument.type === "LeaveOfAbsence";
  const UANsData = await GetUANsData({
    guild_id: Interaction.guildId,
    user_id: NoticeDocument.user,
    type: NoticeDocument.type,
  });

  const ShiftsData = await GetMainShiftsData({
    user: NoticeDocument.user,
    guild: NoticeDocument.guild,
  });

  const NoticeType = IsLOA ? "LOA" : "RA";
  const NoticeTypeMid = IsLOA ? "Leave" : "Reduced Activity";
  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Info)
    .setTitle("Additional Officer Info");

  if (UANsData.recent_notice) {
    ReplyEmbed.addFields({
      name: `${NoticeType} Statistics`,
      value: Dedent(`
        >>> **Taken ${NoticeType}s:** \`${UANsData.completed_notices.length}\`
        **Recent ${NoticeTypeMid}:**
        - Ended: ${FormatTime(UANsData.recent_notice.early_end_date ?? UANsData.recent_notice.end_date, "D")}
        - Duration: ${UANsData.recent_notice.duration_hr}
      `),
    });
  } else {
    ReplyEmbed.addFields({
      name: `${NoticeType} Statistics`,
      value: Dedent(`
        >>> **Taken ${NoticeType}s:** \`${UANsData.completed_notices.length}\`
        **Recent ${NoticeTypeMid}:** None
      `),
    });
  }

  ReplyEmbed.addFields({
    name: "Shift Statistics",
    value: Dedent(`
      >>> **Shift Count:** \`${ShiftsData.shift_count}\`
      **Frequent S. Type:** \`${ShiftsData.frequent_shift_type}\`
      **Total Time:** ${ShiftsData.total_onduty}
      **Average Time:** ${ShiftsData.avg_onduty}
    `),
  });

  Interaction.reply({ embeds: [ReplyEmbed], flags: MessageFlags.Ephemeral });
}

/**
 * Processes the approval of a User Activity Notice (LOA or RA).
 * Shows a modal for reviewer notes, updates the document, and assigns appropriate roles.
 * @param Interaction - The button interaction for approval.
 * @param NoticeDocument - The notice document to be approved.
 * @returns A Promise resolving after the approval process is completed.
 */
async function HandleUANApproval(
  Interaction: ButtonInteraction<"cached">,
  NoticeDocument: HNoticeDocument
) {
  const IsLOA = NoticeDocument.type === "LeaveOfAbsence";
  const EventLogger = IsLOA ? LOAEventLogger : RAEventLogger;
  const NoticeType = IsLOA ? "Leave" : "Reduced Activity";

  const NotesModal = GetNotesModal(Interaction, "Approval", false, IsLOA);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 8 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  const UpdatedDocument = await NoticeDocument.getUpToDate();
  if (await HandleNoticeReviewValidation(NotesSubmission, UpdatedDocument, Interaction)) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle(`${NoticeType} Approved`)
    .setDescription(`Successfully approved the ${NoticeType.toLowerCase()} request.`);

  UpdatedDocument.status = "Approved";
  UpdatedDocument.review_date = NotesSubmission.createdAt;
  UpdatedDocument.reviewer_notes = NotesSubmission.fields.getTextInputValue("notes") || null;
  UpdatedDocument.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    UpdatedDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    EventLogger.LogApproval(NotesSubmission, UpdatedDocument),
    HandleUserActivityNoticeRoleAssignment(
      UpdatedDocument.user,
      NotesSubmission.guild,
      IsLOA ? "LeaveOfAbsence" : "ReducedActivity",
      true
    ),
  ]);
}

/**
 * Processes the denial of a User Activity Notice (LOA or RA).
 * Shows a modal for required rejection notes and updates the document status.
 * @param Interaction - The button interaction for denial.
 * @param NoticeDocument - The notice document to be denied.
 * @returns A Promise resolving after the denial process is completed.
 */
async function HandleUANDenial(
  Interaction: ButtonInteraction<"cached">,
  NoticeDocument: HNoticeDocument
) {
  const IsLOA = NoticeDocument.type === "LeaveOfAbsence";
  const EventLogger = IsLOA ? LOAEventLogger : RAEventLogger;
  const NoticeType = IsLOA ? "Leave" : "Reduced Activity";

  const NotesModal = GetNotesModal(Interaction, "Denial", true, IsLOA);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 8 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  const UpdatedDocument = await NoticeDocument.getUpToDate();
  if (await HandleNoticeReviewValidation(NotesSubmission, UpdatedDocument, Interaction)) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle(`${NoticeType} Denied`)
    .setDescription(`Successfully denied the ${NoticeType.toLowerCase()} request.`);

  UpdatedDocument.status = "Denied";
  UpdatedDocument.review_date = NotesSubmission.createdAt;
  UpdatedDocument.reviewer_notes = NotesSubmission.fields.getTextInputValue("notes");
  UpdatedDocument.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    UpdatedDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    EventLogger.LogDenial(NotesSubmission, UpdatedDocument),
  ]);
}

/**
 * Handles the approval of a Leave of Absence extension request.
 * Collects optional reviewer notes and updates the extension status.
 * @param Interaction - The button interaction for extension approval.
 * @param LeaveDocument - The LOA document with pending extension request.
 * @returns A Promise resolving after the extension approval process is completed.
 */
async function HandleExtApproval(
  Interaction: ButtonInteraction<"cached">,
  LeaveDocument: HNoticeDocument
) {
  if (LeaveDocument.type !== "LeaveOfAbsence") {
    return new ErrorEmbed()
      .useErrTemplate("OnlyLeaveExtensionsPossible")
      .replyToInteract(Interaction, true);
  }

  const NotesModal = GetNotesModal(Interaction, "Extension Approval", false, true);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 8 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  const UpdatedDocument = await LeaveDocument.getUpToDate();
  if (await HandleNoticeReviewValidation(NotesSubmission, UpdatedDocument, Interaction)) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Extension Approved")
    .setDescription("Successfully approved the extension request.");

  UpdatedDocument.extension_request!.status = "Approved";
  UpdatedDocument.extension_request!.review_date = NotesSubmission.createdAt;
  UpdatedDocument.extension_request!.reviewer_notes =
    NotesSubmission.fields.getTextInputValue("notes") || null;
  UpdatedDocument.extension_request!.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    UpdatedDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger.LogExtensionApproval(NotesSubmission, UpdatedDocument),
  ]);
}

/**
 * Handles the denial of a Leave of Absence extension request.
 * Collects mandatory rejection notes and updates the extension status.
 * @param Interaction - The button interaction for extension denial.
 * @param LeaveDocument - The LOA document with pending extension request.
 * @returns A Promise resolving after the extension denial process is completed.
 */
async function HandleExtDenial(
  Interaction: ButtonInteraction<"cached">,
  LeaveDocument: HNoticeDocument
) {
  if (LeaveDocument.type !== "LeaveOfAbsence") {
    return new ErrorEmbed()
      .useErrTemplate("OnlyLeaveExtensionsPossible")
      .replyToInteract(Interaction, true);
  }

  const NotesModal = GetNotesModal(Interaction, "Extension Denial", true, true);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 8 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  const UpdatedDocument = await LeaveDocument.getUpToDate();
  if (await HandleNoticeReviewValidation(NotesSubmission, UpdatedDocument, Interaction)) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Extension Denied")
    .setDescription("Successfully denied the extension request.");

  UpdatedDocument.extension_request!.status = "Denied";
  UpdatedDocument.extension_request!.review_date = NotesSubmission.createdAt;
  UpdatedDocument.extension_request!.reviewer_notes =
    NotesSubmission.fields.getTextInputValue("notes") || null;
  UpdatedDocument.extension_request!.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    UpdatedDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger.LogExtensionDenial(NotesSubmission, UpdatedDocument),
  ]);
}

/**
 * Creates a modal for collecting reviewer notes during the approval/denial process.
 * @param Interaction - The button interaction that triggered the review.
 * @param ReviewOutcome - The type of review being performed.
 * @param NotesRequired - Whether notes are mandatory. Defaults to false.
 * @param IsLOA - Whether this is for a Leave of Absence (true) or Reduced Activity (false).
 * @returns A configured modal for collecting reviewer notes.
 */
function GetNotesModal(
  Interaction: ButtonInteraction<"cached">,
  ReviewOutcome: "Approval" | "Denial" | "Extension Approval" | "Extension Denial",
  NotesRequired: boolean = false,
  IsLOA: boolean = true
) {
  const NoticeType = IsLOA ? "Leave of Absence" : "Reduced Activity";
  const Modal = new ModalBuilder()
    .setTitle(`${NoticeType} ${ReviewOutcome}`)
    .setCustomId(`uan-rev-notes:${Interaction.user.id}:${RandomString(4)}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setRequired(NotesRequired)
          .setMinLength(4)
          .setMaxLength(128)
          .setLabel("Notes")
          .setCustomId("notes")
      )
    );

  if (ReviewOutcome.endsWith("Approval")) {
    Modal.components[0].components[0].setPlaceholder("Any notes or comments to add.");
  } else {
    Modal.components[0].components[0].setPlaceholder(
      "Any notes or comments to explain the disapproval."
    );
  }

  return Modal;
}

/**
 * Creates disabled versions of all message components from the original interaction.
 * Used to disable buttons after an action has been taken.
 * @param Interaction - The interaction containing components to disable.
 * @returns An array of action rows with disabled components.
 */
function GetDisabledMessageComponents(
  Interaction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">
) {
  return Interaction.message?.components.map((AR) => {
    return ActionRowBuilder.from({
      // @ts-expect-error; Type conflict.
      components: AR.components.map((Comp) => createComponentBuilder(Comp.data).setDisabled(true)),
    });
  }) as any;
}
