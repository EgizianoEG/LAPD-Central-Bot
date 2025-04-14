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

import { ErrorEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { GetErrorId, RandomString } from "@Utilities/Strings/Random.js";
import { UserHasPermsV2 } from "@Utilities/Database/UserHasPermissions.js";
import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { Embeds } from "@Config/Shared.js";

import HandleLeaveRoleAssignment from "@Utilities/Other/HandleLeaveRoleAssignment.js";
import LeaveOfAbsenceModel from "@Models/UserActivityNotice.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import UANLogger from "@Utilities/Classes/UANEventLogger.js";
import GetLOAsData from "@Utilities/Database/GetUANData.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Dedent from "dedent";

type HLeaveDocument = UserActivityNotice.ActivityNoticeHydratedDocument;
const FunctionMap = {
  "loa-approve": HandleLeaveApproval,
  "loa-deny": HandleLeaveDenial,
  "loa-info": HandleLeaveAddInfo,

  "loa-ext-approve": HandleExtApproval,
  "loa-ext-deny": HandleExtDenial,
};

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
export default async function LOAManagementHandlerWrapper(
  _: DiscordClient,
  Interaction: BaseInteraction
) {
  if (
    !Interaction.isButton() ||
    !Interaction.inCachedGuild() ||
    !Interaction.customId.match(/^loa-(app|den|inf)[\w-]*:/)
  ) {
    return;
  }

  try {
    if (await HandleUnauthorizedLeaveManagement(Interaction)) return;
    await LOAManagementHandler(Interaction);
  } catch (Err: any) {
    const ErrorId = GetErrorId();
    AppLogger.error({
      label: "Events:InteractionCreate:LOAManagementHandler.ts",
      message: "Failed to handle LOA management button interaction;",
      error_id: ErrorId,
      stack: Err.stack,
    });

    return new ErrorEmbed()
      .useErrTemplate("UnknownError")
      .setDescription("Something went wrong while handling your request.")
      .setErrorId(ErrorId)
      .replyToInteract(Interaction, true);
  }
}

/**
 * Handles the LOA management buttons on sent/pending requests, i.e., approving, denying, and reviewing LOAs by a management staff member.
 * Button custom id format: loa-<action>:<requester_id>:<request_id/loa_id>
 * - Actions: `loa-approve`, `loa-deny`, `loa-info`, `loa-ext-approve`, `loa-ext-deny`.
 * - The `request_id` is the unique Id of the LOA request, which is stored in the database.
 * @param Client
 * @param Interaction
 * @returns
 */
async function LOAManagementHandler(Interaction: ButtonInteraction<"cached">) {
  const [Action, , LeaveId] = Interaction.customId.split(":");
  const RequestDocument = await LeaveOfAbsenceModel.findById(LeaveId).exec();
  if (await HandleLeaveReviewValidation(Interaction, RequestDocument)) return;
  return FunctionMap[Action](Interaction, RequestDocument);
}

/**
 * Handles unauthorized leave management.
 * @param Interaction - The button interaction.
 * @returns A boolean indicating whether the action was authorized or not.
 */
async function HandleUnauthorizedLeaveManagement(Interaction: ButtonInteraction<"cached">) {
  const IsActionAuthorized = await UserHasPermsV2(Interaction.user.id, Interaction.guildId, {
    management: true,
  });

  if (!IsActionAuthorized) {
    return new UnauthorizedEmbed()
      .useErrTemplate("LOAUnauthorizedManagement")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }

  return false;
}

/**
 * Validates approval or denial of a leave of absence request before proceeding.
 * @param Interaction
 * @param RequestDocument
 * @param InitialInteraction
 * @returns
 */
async function HandleLeaveReviewValidation(
  Interaction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  RequestDocument?: HLeaveDocument | null,
  InitialInteraction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached"> = Interaction
): Promise<boolean> {
  const IsExtensionRequest =
    RequestDocument?.status !== "Pending" && RequestDocument?.extension_request;
  const RequestHasToBeReviewed =
    (RequestDocument?.status === "Pending" && RequestDocument?.review_date === null) ||
    (RequestDocument?.is_active && RequestDocument?.extension_request?.status === "Pending");

  if (!RequestHasToBeReviewed) {
    let UpdatedReqEmbed: EmbedBuilder;
    const ReplyEmbed = new EmbedBuilder()
      .setColor(Embeds.Colors.Error)
      .setTitle("Request Modified")
      .setDescription(
        "The request you are taking action on either does not exist or has already been reviewed."
      );

    if (RequestDocument && IsExtensionRequest) {
      UpdatedReqEmbed = await UANLogger.GetLOAExtRequestMessageEmbedWithStatus(
        Interaction.guild,
        RequestDocument,
        RequestDocument.extension_request!.status
      );
    } else if (RequestDocument) {
      UpdatedReqEmbed = await UANLogger.GetLOARequestMessageEmbedWithStatus(
        Interaction.guild,
        RequestDocument,
        RequestDocument.status
      );
    }

    return Promise.all([
      Interaction.reply({ embeds: [ReplyEmbed], flags: MessageFlags.Ephemeral }).catch(() =>
        Interaction.editReply({ embeds: [ReplyEmbed] })
      ),
      InitialInteraction.editReply({
        embeds: [UpdatedReqEmbed!],
        message: RequestDocument?.request_msg?.split(":")[1],
        components: GetDisabledMessageComponents(InitialInteraction),
      }),
    ]).then(() => true);
  }

  return false;
}

/**
 * Handles "Additional Information" button. Shows the LOA stats and shift stats of the requester.
 * The 'Recent Leave' field represents the most recent LOA taken by the user which has ended, not the active or pending one.
 * Average and total time of the shift statistics are calculated using the "on_duty" durations.
 * @param Interaction
 * @param LeaveDocument
 */
async function HandleLeaveAddInfo(
  Interaction: ButtonInteraction<"cached">,
  LeaveDocument: HLeaveDocument
) {
  const LOAsData = await GetLOAsData({
    guild_id: Interaction.guildId,
    user_id: LeaveDocument.user,
  });

  const ShiftsData = await GetMainShiftsData({
    user: LeaveDocument.user,
    guild: LeaveDocument.guild,
  });

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Info)
    .setTitle("Additional Officer Info")
    .setFields(
      {
        name: "LOA Stats",
        value: Dedent(`
          **Taken LOAs:** \`${LOAsData.completed_notices.length}\`
          **Recent Leave:** ${LOAsData.recent_notice ? FormatTime(LOAsData.recent_notice.early_end_date ?? LOAsData.recent_notice.end_date, "D") : "None"}
        `),
      },
      {
        name: "Shift Stats",
        value: Dedent(`
        **Shift Count:** \`${ShiftsData.shift_count}\`
        **Total Time:** ${ShiftsData.total_onduty}
        **Average Time:** ${ShiftsData.avg_onduty}
      `),
      }
    );

  Interaction.reply({ embeds: [ReplyEmbed], flags: MessageFlags.Ephemeral });
}

async function HandleLeaveApproval(
  Interaction: ButtonInteraction<"cached">,
  LeaveDocument: HLeaveDocument
) {
  const NotesModal = GetNotesModal(Interaction, "Approval", false);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });
  LeaveDocument = await LeaveDocument.getUpToDate();
  if (await HandleLeaveReviewValidation(NotesSubmission, LeaveDocument, Interaction)) return;

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Approved")
    .setDescription("Successfully approved the leave request.");

  LeaveDocument.status = "Approved";
  LeaveDocument.review_date = NotesSubmission.createdAt;
  LeaveDocument.reviewer_notes = NotesSubmission.fields.getTextInputValue("notes") || null;
  LeaveDocument.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    LeaveDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    UANLogger.LogApproval(NotesSubmission, LeaveDocument),
    HandleLeaveRoleAssignment(LeaveDocument.user, NotesSubmission.guild, true),
  ]);
}

async function HandleLeaveDenial(
  Interaction: ButtonInteraction<"cached">,
  LeaveDocument: HLeaveDocument
) {
  const NotesModal = GetNotesModal(Interaction, "Denial", true);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });
  LeaveDocument = await LeaveDocument.getUpToDate();
  if (await HandleLeaveReviewValidation(NotesSubmission, LeaveDocument, Interaction)) return;

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Denied")
    .setDescription("Successfully denied the leave request.");

  LeaveDocument.status = "Denied";
  LeaveDocument.review_date = NotesSubmission.createdAt;
  LeaveDocument.reviewer_notes = NotesSubmission.fields.getTextInputValue("notes");
  LeaveDocument.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    LeaveDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    UANLogger.LogDenial(NotesSubmission, LeaveDocument),
  ]);
}

async function HandleExtApproval(
  Interaction: ButtonInteraction<"cached">,
  LeaveDocument: HLeaveDocument
) {
  const NotesModal = GetNotesModal(Interaction, "Extension Approval", false);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });
  LeaveDocument = await LeaveDocument.getUpToDate();
  if (await HandleLeaveReviewValidation(NotesSubmission, LeaveDocument, Interaction)) return;

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Extension Approved")
    .setDescription("Successfully approved the extension request.");

  LeaveDocument.extension_request!.status = "Approved";
  LeaveDocument.extension_request!.review_date = NotesSubmission.createdAt;
  LeaveDocument.extension_request!.reviewer_notes =
    NotesSubmission.fields.getTextInputValue("notes") || null;
  LeaveDocument.extension_request!.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    LeaveDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    UANLogger.LogExtensionApproval(NotesSubmission, LeaveDocument),
  ]);
}

async function HandleExtDenial(
  Interaction: ButtonInteraction<"cached">,
  LeaveDocument: HLeaveDocument
) {
  const NotesModal = GetNotesModal(Interaction, "Extension Denial", true);
  await Interaction.showModal(NotesModal);

  const NotesSubmission = await Interaction.awaitModalSubmit({
    filter: (ModalSubmission) => ModalSubmission.customId === NotesModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  await NotesSubmission.deferReply({ flags: MessageFlags.Ephemeral });
  LeaveDocument = await LeaveDocument.getUpToDate();
  if (await HandleLeaveReviewValidation(NotesSubmission, LeaveDocument, Interaction)) return;

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Extension Approved")
    .setDescription("Successfully approved the extension request.");

  LeaveDocument.extension_request!.status = "Denied";
  LeaveDocument.extension_request!.review_date = NotesSubmission.createdAt;
  LeaveDocument.extension_request!.reviewer_notes =
    NotesSubmission.fields.getTextInputValue("notes");
  LeaveDocument.extension_request!.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    LeaveDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    UANLogger.LogExtensionDenial(NotesSubmission, LeaveDocument),
  ]);
}

function GetNotesModal(
  Interaction: ButtonInteraction<"cached">,
  Status: "Approval" | "Denial" | "Extension Approval" | "Extension Denial",
  NotesRequired: boolean = false
) {
  const Modal = new ModalBuilder()
    .setTitle(`Leave of Absence ${Status}`)
    .setCustomId(`loa-rev-notes:${Interaction.user.id}:${RandomString(4)}`)
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

  if (Status.endsWith("Approval")) {
    Modal.components[0].components[0].setPlaceholder("Any notes or comments to add.");
  } else {
    Modal.components[0].components[0].setPlaceholder(
      "Any notes or comments to explain the disapproval."
    );
  }

  return Modal;
}

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
