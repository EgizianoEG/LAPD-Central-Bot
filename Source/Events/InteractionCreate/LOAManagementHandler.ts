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
} from "discord.js";

import { LeaveOfAbsence } from "@Typings/Utilities/Database.js";
import { RandomString } from "@Utilities/Strings/Random.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { Embeds } from "@Config/Shared.js";

import HandleLeaveRoleAssignment from "@Utilities/Other/HandleLeaveRoleAssignment.js";
import LeaveOfAbsenceModel from "@Models/LeaveOfAbsence.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import LOAEventLogger from "@Utilities/Classes/LOAEventLogger.js";
import GetLOAsData from "@Utilities/Database/GetLOAData.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Dedent from "dedent";

type HLeaveDocument = LeaveOfAbsence.LeaveOfAbsenceHydratedDocument;
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
  _,
  Interaction: BaseInteraction<"cached">
) {
  if (!Interaction.isButton() || !Interaction.customId.match(/^loa-(app|den|inf)[\w-]*:/)) return;
  try {
    await LOAManagementHandler(Interaction);
  } catch (Err: any) {
    const ErrorId = RandomString(6, /[\dA-Z]/i);
    AppLogger.error({
      label: "Events:InteractionCreate:LOAManagementHandler.ts",
      message: "Failed to handle LOA management button interaction;",
      error_id: ErrorId,
      stack: Err.stack,
    });

    return new ErrorEmbed()
      .useErrTemplate("UnknownError")
      .setDescription("Something went wrong while handling your request.")
      .setFooter({ text: `Error ID: ${ErrorId}` })
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
    RequestDocument?.status !== "Pending" && RequestDocument?.extension_req;
  const RequestHasToBeReviewed =
    (RequestDocument?.status === "Pending" && RequestDocument?.review_date === null) ||
    (RequestDocument?.is_active && RequestDocument?.extension_req?.status === "Pending");

  if (!RequestHasToBeReviewed) {
    let UpdatedReqEmbed: EmbedBuilder;
    const ReplyEmbed = new EmbedBuilder()
      .setColor(Embeds.Colors.Error)
      .setTitle("Request Modified")
      .setDescription(
        "The request you are taking action on either does not exist or has already been reviewed."
      );

    if (RequestDocument && IsExtensionRequest) {
      UpdatedReqEmbed = LOAEventLogger.GetLOAExtRequestMessageEmbedWithStatus(
        RequestDocument,
        RequestDocument.extension_req!.status
      );
    } else if (RequestDocument) {
      UpdatedReqEmbed = LOAEventLogger.GetLOARequestMessageEmbedWithStatus(
        RequestDocument,
        RequestDocument.status
      );
    }

    return Promise.all([
      Interaction.reply({ embeds: [ReplyEmbed], ephemeral: true }).catch(() =>
        Interaction.editReply({ embeds: [ReplyEmbed] })
      ),
      InitialInteraction.message?.edit({
        embeds: [UpdatedReqEmbed!],
        components: GetDisabledMessageComponents(InitialInteraction as any),
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
          **Taken LOAs:** \`${LOAsData.loas_taken.length}\`
          **Recent Leave:** ${LOAsData.recent_loa ? FormatTime(LOAsData.recent_loa.early_end_date ?? LOAsData.recent_loa.end_date, "D") : "None"}
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

  Interaction.reply({ embeds: [ReplyEmbed], ephemeral: true });
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
  await NotesSubmission.deferReply({ ephemeral: true });
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
    LOAEventLogger.LogApproval(NotesSubmission, LeaveDocument),
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
  await NotesSubmission.deferReply({ ephemeral: true });
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
    LOAEventLogger.LogDenial(NotesSubmission, LeaveDocument),
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
  await NotesSubmission.deferReply({ ephemeral: true });
  LeaveDocument = await LeaveDocument.getUpToDate();
  if (await HandleLeaveReviewValidation(NotesSubmission, LeaveDocument, Interaction)) return;

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Extension Approved")
    .setDescription("Successfully approved the extension request.");

  LeaveDocument.extension_req!.status = "Approved";
  LeaveDocument.extension_req!.review_date = NotesSubmission.createdAt;
  LeaveDocument.extension_req!.reviewer_notes =
    NotesSubmission.fields.getTextInputValue("notes") || null;
  LeaveDocument.extension_req!.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    LeaveDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger.LogExtensionApproval(NotesSubmission, LeaveDocument),
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
  await NotesSubmission.deferReply({ ephemeral: true });
  LeaveDocument = await LeaveDocument.getUpToDate();
  if (await HandleLeaveReviewValidation(NotesSubmission, LeaveDocument, Interaction)) return;

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Extension Approved")
    .setDescription("Successfully approved the extension request.");

  LeaveDocument.extension_req!.status = "Denied";
  LeaveDocument.extension_req!.review_date = NotesSubmission.createdAt;
  LeaveDocument.extension_req!.reviewer_notes = NotesSubmission.fields.getTextInputValue("notes");
  LeaveDocument.extension_req!.reviewed_by = {
    id: Interaction.user.id,
    username: Interaction.user.username,
  };

  return Promise.all([
    LeaveDocument.save(),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger.LogExtensionDenial(NotesSubmission, LeaveDocument),
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
