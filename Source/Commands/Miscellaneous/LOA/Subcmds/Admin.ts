/* eslint-disable sonarjs/no-duplicate-string */
import {
  SlashCommandSubcommandBuilder,
  APIButtonComponentWithCustomId,
  InteractionReplyOptions,
  ModalSubmitInteraction,
  time as FormatTime,
  ButtonInteraction,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  ButtonBuilder,
  EmbedBuilder,
  ModalBuilder,
  userMention,
  ButtonStyle,
  Colors,
  User,
} from "discord.js";

import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { RandomString } from "@Utilities/Strings/Random.js";
import { Embeds, Emojis } from "@Config/Shared.js";
import { LeaveOfAbsence } from "@Typings/Utilities/Database.js";
import { HandleDurationValidation } from "./Request.js";
import { ValidateExtendedDuration } from "./Manage.js";
import { addMilliseconds, compareDesc } from "date-fns";

import HandleLeaveRoleAssignment from "@Utilities/Other/HandleLeaveRoleAssignment.js";
import LeaveOfAbsenceModel from "@Models/LeaveOfAbsence.js";
import LOAEventLogger from "@Utilities/Classes/LOAEventLogger.js";
import ParseDuration from "parse-duration";
import GetLOAsData from "@Utilities/Database/GetLOAData.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Dedent from "dedent";

const FileLabel = "Commands:Miscellaneous:LOA:Subcmds:Admin";
type CmdOrButtonInteraction = SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">;
enum AdminActions {
  LeaveStart = "loa-admin-start",
  LeaveEnd = "loa-admin-end",
  LeaveDeny = "loa-admin-deny",
  LeaveExtend = "loa-admin-extend",
  LeaveApprove = "loa-admin-approve",
  ExtensionDeny = "loa-ext-admin-deny",
  ExtensionApprove = "loa-ext-admin-approve",
}

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * A wrapper function that returns a single promise that resolves to `true` if all promises in the array resolve to `true`.
 * This is used to know if a modification was successful or not to the initial administration prompt and if so, to dispose the previous component collector and stop it.
 * @param Array
 * @returns
 */
async function PromiseAllThenTrue<T>(Array: T[]): Promise<boolean> {
  await Promise.allSettled(Array);
  return true;
}

/**
 * Retrieves the target member from the interaction.
 * - If the interaction is a button, it retrieves the ID from the embed's author URL.
 * - If the interaction is a command, it retrieves the user from the "member" option.
 * @param Interaction The interaction to retrieve the target member from.
 * @returns The target member or null if not found.
 */
async function GetTargetMember(Interaction: CmdOrButtonInteraction): Promise<User | null> {
  if (Interaction.isButton()) {
    const ReplyMessage = await Interaction.fetchReply();
    const ReplyEmbed = ReplyMessage.embeds[0];
    const TargetMemberId = ReplyEmbed?.data.author?.url?.split("/").pop();
    if (!ReplyEmbed || !TargetMemberId) return null;
    return Interaction.client.users.fetch(TargetMemberId).catch(() => null);
  } else {
    // The target member is an available option in the command.
    return Interaction.options.getUser("member", true);
  }
}

/**
 * Generates the leave of absence administration panel embed.
 * @param Interaction - The interaction that triggered the panel.
 * @param TargetMember - The user who's leave of absence data should be displayed.
 * @param LOAData - The leave of absence data of the `TargetMember`.
 * @returns An embed that displays the leave of absence data of the `TargetMember`.
 */
function GetPanelEmbed(
  Interaction: CmdOrButtonInteraction,
  TargetMember: User,
  LOAData: Awaited<ReturnType<typeof GetLOAsData>>
): EmbedBuilder {
  const ActiveOrPendingLOA = LOAData.active_loa ?? LOAData.pending_loa;
  const PanelEmbed = new EmbedBuilder()
    .setTitle("Leave of Absence Administration")
    .setColor(Colors.DarkBlue)
    .setAuthor({
      name: `@${TargetMember.username}`,
      url: `https://discord.com/users/${TargetMember.id}`,
      iconURL: TargetMember.displayAvatarURL({ size: 128 }),
    });

  const PreviousLOAsFormatted = LOAData.all_loas
    .filter((LOA) => {
      return (
        LOA.status === "Approved" && (LOA.early_end_date ?? LOA.end_date) <= Interaction.createdAt
      );
    })
    .sort((a, b) => compareDesc(a.early_end_date ?? a.end_date, b.early_end_date ?? b.end_date))
    .map((LOA) => {
      return `${FormatTime(LOA.review_date!, "D")} — ${FormatTime(LOA.early_end_date ?? LOA.end_date, "D")}`;
    });

  if (
    ActiveOrPendingLOA?.reviewed_by &&
    ActiveOrPendingLOA.review_date &&
    ActiveOrPendingLOA.extension_req?.status !== "Pending"
  ) {
    PanelEmbed.addFields({
      inline: true,
      name: "Active Leave",
      value: Dedent(`
        **Started**: ${FormatTime(ActiveOrPendingLOA.review_date, "D")}
        **Ends On**: ${FormatTime(ActiveOrPendingLOA.end_date, "D")}
        **Duration**: ${ActiveOrPendingLOA.duration_hr}
        **Approved By**: ${userMention(ActiveOrPendingLOA.reviewed_by.id)}
        **Reason**: ${ActiveOrPendingLOA.reason}
      `),
    });
  } else if (ActiveOrPendingLOA?.status === "Pending") {
    PanelEmbed.addFields({
      inline: true,
      name: "Pending Leave",
      value: Dedent(`
        **Starts On**: *once approved.*
        **Ends On**: around ${FormatTime(addMilliseconds(Interaction.createdAt, ActiveOrPendingLOA.duration), "d")}
        **Duration**: ${ActiveOrPendingLOA.duration_hr}
        **Reason**: ${ActiveOrPendingLOA.reason}
      `),
    });
  } else if (
    ActiveOrPendingLOA?.review_date &&
    ActiveOrPendingLOA?.extension_req?.status === "Pending"
  ) {
    PanelEmbed.addFields({
      inline: true,
      name: "Pending Extension",
      value: Dedent(`
        **LOA Started**: ${FormatTime(ActiveOrPendingLOA.review_date, "D")}
        **LOA Ends**: after extension, ${FormatTime(ActiveOrPendingLOA.end_date, "d")}
        **Duration**: ${ActiveOrPendingLOA.extended_duration_hr}
        **Reason**: ${ActiveOrPendingLOA.extension_req.reason ?? "`N/A`"}
      `),
    });
  } else {
    PanelEmbed.setDescription(
      `${userMention(TargetMember.id)} does not currently have an active or pending leave of absence.`
    );
  }

  if (PreviousLOAsFormatted.length > 0 && PreviousLOAsFormatted.length <= 5) {
    PanelEmbed.addFields({
      inline: true,
      name: "Previously Taken LOAs",
      value: PreviousLOAsFormatted.join("\n"),
    });
  } else if (PreviousLOAsFormatted.length > 5) {
    PanelEmbed.addFields({
      inline: true,
      name: "Previously Taken LOAs",
      value: `${PreviousLOAsFormatted.slice(0, 5).join("\n")}\n-# **...and ${PreviousLOAsFormatted.length - 5} more**`,
    });
  } else if (!(PanelEmbed.data.fields?.length && ActiveOrPendingLOA)) {
    PanelEmbed.addFields({
      inline: true,
      name: "Previously Taken LOAs",
      value: "-# There are no previously approved LOAs to display.",
    });
  }

  return PanelEmbed;
}

/**
 * Creates the components for the leave of absence adminstration panel.
 * @param Interaction - The interaction that triggered the panel. Used to add the id of
 * who initiated the panel to the buttons for validation.
 * @param ActiveOrPendingLeave - The active or pending leave document from the database.
 * @returns An array of action row components to be added to the panel.
 */
function GetPanelComponents(
  Interaction: CmdOrButtonInteraction,
  ActiveOrPendingLeave: Awaited<ReturnType<typeof GetLOAsData>>["active_loa"]
): ActionRowBuilder<ButtonBuilder>[] {
  const ActionRow = new ActionRowBuilder<ButtonBuilder>();
  if (ActiveOrPendingLeave?.status === "Pending") {
    // If the leave is pending, add the approve and deny buttons.
    ActionRow.addComponents(
      new ButtonBuilder()
        .setEmoji(Emojis.WhiteCheck)
        .setStyle(ButtonStyle.Success)
        .setCustomId(AdminActions.LeaveApprove)
        .setLabel("Approve Request"),
      new ButtonBuilder()
        .setEmoji(Emojis.WhiteCross)
        .setStyle(ButtonStyle.Danger)
        .setCustomId(AdminActions.LeaveDeny)
        .setLabel("Deny Request")
    );
  } else if (
    ActiveOrPendingLeave?.is_active &&
    ActiveOrPendingLeave.extension_req?.status === "Pending"
  ) {
    // If the leave is active and has a pending extension, add the approve and deny extension buttons.
    ActionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(AdminActions.ExtensionApprove)
        .setStyle(ButtonStyle.Success)
        .setEmoji(Emojis.WhiteCheck)
        .setLabel("Approve Extension"),
      new ButtonBuilder()
        .setCustomId(AdminActions.ExtensionDeny)
        .setStyle(ButtonStyle.Danger)
        .setEmoji(Emojis.WhiteCross)
        .setLabel("Deny Extension"),
      new ButtonBuilder()
        .setCustomId(AdminActions.LeaveEnd)
        .setStyle(ButtonStyle.Danger)
        .setEmoji(Emojis.MediaStop)
        .setLabel("End Leave")
    );
  } else {
    // If the leave is not pending or active, add the start and end leave buttons.
    ActionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(AdminActions.LeaveExtend)
        .setStyle(ButtonStyle.Success)
        .setEmoji(Emojis.WhitePlus)
        .setDisabled(Boolean(ActiveOrPendingLeave?.extension_req))
        .setLabel("Extend Leave"),
      new ButtonBuilder()
        .setCustomId(AdminActions.LeaveEnd)
        .setStyle(ButtonStyle.Danger)
        .setEmoji(Emojis.MediaStop)
        .setLabel("End Leave")
    );
  }

  // Disable the buttons if there is no leave active.
  if (
    !ActiveOrPendingLeave ||
    (ActiveOrPendingLeave.status === "Approved" && ActiveOrPendingLeave.is_over)
  ) {
    ActionRow.setComponents(
      new ButtonBuilder()
        .setEmoji(Emojis.WhitePlus)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(AdminActions.LeaveStart)
        .setLabel("Start Leave of Absence")
    );
  }

  // Add the user id and leave id to the custom_id of each button.
  ActionRow.components.forEach((Button) =>
    Button.setCustomId(
      `${(Button.data as APIButtonComponentWithCustomId).custom_id}:${Interaction.user.id}:${ActiveOrPendingLeave?._id ?? "0"}`
    )
  );

  return [ActionRow];
}

/**
 * Creates a modal for the user to input notes for a leave of absence request/review.
 * @param Interaction - The interaction object received when the slash command was invoked or the button was clicked.
 * @param Status - The type of action being performed.
 * @param [NotesRequired=false] - Whether the user is required to input notes.
 * @returns A modal builder with a single text input field for notes.
 */
function GetNotesModal(
  Interaction: CmdOrButtonInteraction,
  Status: "Approval" | "Denial" | "Extension Approval" | "Extension Denial",
  NotesRequired: boolean = false
): ModalBuilder {
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

  // Set the placeholder text based on the action being performed.
  if (Status.endsWith("Approval")) {
    Modal.components[0].components[0].setPlaceholder("Any notes or comments to add.");
  } else {
    Modal.components[0].components[0].setPlaceholder(
      "Any notes or comments to explain the disapproval."
    );
  }

  return Modal;
}

async function HandleAdministrativeInteraction(
  ButtonInteract: ButtonInteraction<"cached">,
  TargetMemberId: string,
  Interaction: CmdOrButtonInteraction
) {
  if (ButtonInteract.customId.startsWith(AdminActions.LeaveStart)) {
    return HandleLeaveStart(ButtonInteract, TargetMemberId, Interaction);
  } else if (ButtonInteract.customId.startsWith(AdminActions.LeaveEnd)) {
    return HandleLeaveEnd(ButtonInteract, TargetMemberId, Interaction);
  } else if (ButtonInteract.customId.startsWith(AdminActions.LeaveExtend)) {
    return HandleLeaveExtend(ButtonInteract, TargetMemberId, Interaction);
  } else if (ButtonInteract.customId.startsWith(AdminActions.LeaveApprove)) {
    return HandleLeaveApprovalOrDenial(ButtonInteract, TargetMemberId, Interaction, "Approval");
  } else if (ButtonInteract.customId.startsWith(AdminActions.LeaveDeny)) {
    return HandleLeaveApprovalOrDenial(ButtonInteract, TargetMemberId, Interaction, "Denial");
  } else if (ButtonInteract.customId.startsWith(AdminActions.ExtensionApprove)) {
    return HandleExtensionApprovalOrDenial(
      ButtonInteract,
      TargetMemberId,
      Interaction,
      "Extension Approval"
    );
  } else if (ButtonInteract.customId.startsWith(AdminActions.ExtensionDeny)) {
    return HandleExtensionApprovalOrDenial(
      ButtonInteract,
      TargetMemberId,
      Interaction,
      "Extension Denial"
    );
  } else {
    return ButtonInteract.deferUpdate();
  }
}

async function GetActiveOrPendingLOA(
  TargetUser: string,
  TargetGuild: string,
  ComparisonDate: Date = new Date()
) {
  return LeaveOfAbsenceModel.findOne(
    {
      user: TargetUser,
      guild: TargetGuild,
      $or: [
        { status: "Pending", review_date: null },
        {
          status: "Approved",
          early_end_date: null,
          end_date: { $gt: ComparisonDate },
        },
      ],
    },
    { status: 1 }
  ).exec();
}

async function HandleLeaveReviewValidation(
  Interaction: CmdOrButtonInteraction | ModalSubmitInteraction<"cached">,
  RequestDocument?: LeaveOfAbsence.LeaveOfAbsenceHydratedDocument | null
): Promise<boolean> {
  const RequestHasToBeReviewed =
    (RequestDocument?.status === "Pending" && RequestDocument?.review_date === null) ||
    (RequestDocument?.is_active && RequestDocument?.extension_req?.status === "Pending");

  if (!RequestHasToBeReviewed) {
    const ReplyEmbed = new EmbedBuilder()
      .setColor(Embeds.Colors.Error)
      .setTitle("Request Modified")
      .setDescription(
        "The request you are taking action on either does not exist or has already been reviewed."
      );

    return Interaction.editReply({ embeds: [ReplyEmbed] })
      .catch(() => Interaction.reply({ embeds: [ReplyEmbed], ephemeral: true }))
      .then(() => true);
  }

  return false;
}

async function HandleLeaveStart(
  ButtonInteract: ButtonInteraction<"cached">,
  TargetMemberId: string,
  InitialCmdInteract: CmdOrButtonInteraction
) {
  let ActiveOrPendingLOA = await GetActiveOrPendingLOA(
    TargetMemberId,
    ButtonInteract.guildId,
    ButtonInteract.createdAt
  );

  if (ActiveOrPendingLOA) {
    return PromiseAllThenTrue([
      Callback(InitialCmdInteract),
      new ErrorEmbed()
        .useErrTemplate("LOAAlreadyExists")
        .replyToInteract(ButtonInteract, true, true),
    ]);
  }

  const LeaveOptsModal = new ModalBuilder()
    .setTitle("Administrative Leave of Absence")
    .setCustomId(`loa-admin-start:${ButtonInteract.user.id}:${RandomString(4)}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(32)
          .setCustomId("duration")
          .setLabel("Leave Duration")
          .setPlaceholder("e.g., 1 week and 2 days...")
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(5)
          .setMaxLength(232)
          .setCustomId("notes")
          .setLabel("Leave Notes")
          .setPlaceholder("e.g., requested on behalf of...")
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMinLength(2)
          .setMaxLength(3)
          .setCustomId("manageable")
          .setValue("Yes")
          .setLabel("Leave Manageable By Target")
          .setPlaceholder("Please type either 'Yes' or 'No'")
      )
    );

  await ButtonInteract.showModal(LeaveOptsModal);
  const ModalSubmission = await ButtonInteract.awaitModalSubmit({
    filter: (Modal) => Modal.customId === LeaveOptsModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!ModalSubmission) return;
  await ModalSubmission.deferReply({ ephemeral: true });

  const LeaveReason = ModalSubmission.fields.getTextInputValue("notes");
  const LeaveDuration = ModalSubmission.fields.getTextInputValue("duration");
  const DurationParsed = Math.round(ParseDuration(LeaveDuration, "millisecond") ?? 0);
  const IsManageableInput = ModalSubmission.fields.getTextInputValue("manageable");
  if (await HandleDurationValidation(ModalSubmission, DurationParsed)) return;

  ActiveOrPendingLOA = await GetActiveOrPendingLOA(
    TargetMemberId,
    ButtonInteract.guildId,
    ButtonInteract.createdAt
  );

  if (ActiveOrPendingLOA) {
    return new ErrorEmbed()
      .useErrTemplate("LOAAlreadyExists")
      .replyToInteract(ModalSubmission, true, true);
  }

  const CreatedLeave = await LeaveOfAbsenceModel.create({
    guild: ModalSubmission.guildId,
    user: TargetMemberId,
    status: "Approved",
    reason: "[Administrative]",
    duration: DurationParsed,
    is_manageable: IsManageableInput ? IsManageableInput.toLowerCase() === "yes" : false,
    request_date: ModalSubmission.createdAt,
    review_date: ModalSubmission.createdAt,
    reviewer_notes: LeaveReason,
    reviewed_by: {
      id: ModalSubmission.user.id,
      username: ModalSubmission.user.username,
    },
  });

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave of Absence Started")
    .setDescription(
      `Successfully started a new leave of absence for ${userMention(TargetMemberId)}. It is scheduled to end on ${FormatTime(CreatedLeave.end_date, "D")}.`
    );

  return PromiseAllThenTrue([
    Callback(InitialCmdInteract),
    ModalSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger.LogManualLeave(ModalSubmission, CreatedLeave),
    HandleLeaveRoleAssignment(CreatedLeave.user, ModalSubmission.guild, true),
  ]);
}

async function HandleLeaveExtend(
  ButtonInteract: ButtonInteraction<"cached">,
  TargetMemberId: string,
  InitialCmdInteract: CmdOrButtonInteraction
) {
  let ActiveLeave = await LeaveOfAbsenceModel.findOne({
    guild: ButtonInteract.guildId,
    user: TargetMemberId,
    status: "Approved",
    early_end_date: null,
    extension_req: null,
    end_date: { $gt: ButtonInteract.createdAt },
  });

  if (!ActiveLeave) {
    return PromiseAllThenTrue([
      Callback(InitialCmdInteract),
      new ErrorEmbed()
        .useErrTemplate("NoActiveLOAOrExistingExtension")
        .replyToInteract(ButtonInteract, true),
    ]);
  }

  const ExtensionOptsModal = new ModalBuilder()
    .setTitle("Leave of Absence Extension")
    .setCustomId(`loa-admin-ext:${ButtonInteract.user.id}:${RandomString(4)}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(32)
          .setCustomId("ext-duration")
          .setLabel("Extension Duration")
          .setPlaceholder("e.g., 3 days...")
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(5)
          .setMaxLength(232)
          .setCustomId("ext-notes")
          .setLabel("Extension Notes")
          .setPlaceholder("e.g., extended on behalf of...")
      )
    );

  await ButtonInteract.showModal(ExtensionOptsModal);
  const Submission = await ButtonInteract.awaitModalSubmit({
    filter: (s) => s.customId === ExtensionOptsModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!Submission) return;
  const Duration = Submission.fields.getTextInputValue("ext-duration");
  const NotesInput = Submission.fields.getTextInputValue("ext-notes") || null;
  const ParsedDuration = Math.round(ParseDuration(Duration, "millisecond") ?? 0);
  const SubmissionHandled = ValidateExtendedDuration(Submission, ActiveLeave, ParsedDuration);
  if (SubmissionHandled) return;
  else Submission.deferReply({ ephemeral: true });

  ActiveLeave = await ActiveLeave.getUpToDate();
  if (ActiveLeave.extension_req) {
    return PromiseAllThenTrue([
      Callback(InitialCmdInteract),
      new ErrorEmbed()
        .useErrTemplate("LOAAdminExistingExtension")
        .replyToInteract(ButtonInteract, true),
    ]);
  }

  ActiveLeave.extension_req = {
    status: "Approved",
    reason: "[Administrative]",
    date: Submission.createdAt,
    review_date: Submission.createdAt,
    duration: ParsedDuration,
    reviewer_notes: NotesInput,
    reviewed_by: {
      id: Submission.user.id,
      username: Submission.user.username,
    },
  };

  await ActiveLeave.save();
  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave Extended")
    .setDescription(
      `Successfully extended the active leave of absence for ${userMention(TargetMemberId)}. This leave is now set to expire on ${FormatTime(ActiveLeave.end_date, "D")}.`
    );

  return PromiseAllThenTrue([
    Callback(InitialCmdInteract),
    Submission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger.LogManualExtension(Submission, ActiveLeave),
  ]);
}

async function HandleLeaveEnd(
  ButtonInteract: ButtonInteraction<"cached">,
  TargetMemberId: string,
  InitialCmdInteract: CmdOrButtonInteraction
) {
  let ActiveLeave = await LeaveOfAbsenceModel.findOne({
    guild: ButtonInteract.guildId,
    user: TargetMemberId,
    status: "Approved",
    early_end_date: null,
    end_date: { $gt: ButtonInteract.createdAt },
  });

  if (!ActiveLeave) {
    return PromiseAllThenTrue([
      Callback(InitialCmdInteract),
      new ErrorEmbed().useErrTemplate("LOANotActive").replyToInteract(ButtonInteract, true),
    ]);
  }

  const ReasonModal = new ModalBuilder()
    .setTitle("Leave of Absence Early Termination")
    .setCustomId(`loa-admin-end-reason:${ButtonInteract.user.id}:${RandomString(4)}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setLabel("Early Termination Reason")
          .setPlaceholder("The reason for early termination of this leave.")
          .setCustomId("reason")
          .setRequired(false)
          .setMinLength(4)
          .setMaxLength(128)
      )
    );

  await ButtonInteract.showModal(ReasonModal);
  const ModalSubmission = await ButtonInteract.awaitModalSubmit({
    filter: (Modal) => Modal.customId === ReasonModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  ActiveLeave = await ActiveLeave.getUpToDate();
  if (!ModalSubmission) return;
  if (!ActiveLeave?.is_active) {
    return PromiseAllThenTrue([
      Callback(InitialCmdInteract),
      new ErrorEmbed().useErrTemplate("LOANotActive").replyToInteract(ModalSubmission, true),
    ]);
  }

  await ModalSubmission.deferReply({ ephemeral: true });
  ActiveLeave.end_handled = true;
  ActiveLeave.early_end_date = ModalSubmission.createdAt;
  ActiveLeave.early_end_reason = ModalSubmission.fields.getTextInputValue("reason") || null;
  await ActiveLeave.save();

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Leave of Absence Terminated")
    .setDescription(
      `The active leave of absence for ${userMention(TargetMemberId)} has been successfully terminated.`
    );

  return PromiseAllThenTrue([
    Callback(InitialCmdInteract),
    ModalSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger.LogEarlyLeaveEnd(ModalSubmission, ActiveLeave, "Management"),
    HandleLeaveRoleAssignment(ActiveLeave.user, ModalSubmission.guild, false),
  ]);
}

async function HandleLeaveApprovalOrDenial(
  ButtonInteract: ButtonInteraction<"cached">,
  TargetMemberId: string,
  InitialCmdInteract: CmdOrButtonInteraction,
  ActionType: "Approval" | "Denial"
) {
  const NotesModal = GetNotesModal(ButtonInteract, ActionType, false);
  await ButtonInteract.showModal(NotesModal);

  const NotesSubmission = await ButtonInteract.awaitModalSubmit({
    filter: (s) => s.customId === NotesModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  await NotesSubmission.deferReply({ ephemeral: true });
  const PendingLeave = await LeaveOfAbsenceModel.findOne({
    guild: ButtonInteract.guildId,
    user: TargetMemberId,
    status: "Pending",
  });

  if ((await HandleLeaveReviewValidation(NotesSubmission, PendingLeave)) || !PendingLeave) {
    return Callback(InitialCmdInteract);
  }

  const ActionInPastForm = ActionType === "Approval" ? "Approved" : "Denied";
  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle(`Leave of Absence ${ActionInPastForm}`)
    .setDescription(
      `Successfully ${ActionInPastForm.toLowerCase()} ${userMention(TargetMemberId)}'s pending leave request.`
    );

  PendingLeave.status = ActionInPastForm;
  PendingLeave.review_date = NotesSubmission.createdAt;
  PendingLeave.reviewer_notes = NotesSubmission.fields.getTextInputValue("notes") || null;
  PendingLeave.reviewed_by = {
    id: NotesSubmission.user.id,
    username: NotesSubmission.user.username,
  };

  await PendingLeave.save();
  return PromiseAllThenTrue([
    Callback(InitialCmdInteract),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger[`Log${ActionType}`](NotesSubmission, PendingLeave),
  ]);
}

async function HandleExtensionApprovalOrDenial(
  ButtonInteract: ButtonInteraction<"cached">,
  TargetMemberId: string,
  InitialCmdInteract: CmdOrButtonInteraction,
  ActionType: "Extension Approval" | "Extension Denial"
) {
  const NotesModal = GetNotesModal(ButtonInteract, ActionType, false);
  await ButtonInteract.showModal(NotesModal);

  const NotesSubmission = await ButtonInteract.awaitModalSubmit({
    filter: (s) => s.customId === NotesModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!NotesSubmission) return;
  await NotesSubmission.deferReply({ ephemeral: true });
  const ActiveLeave = await LeaveOfAbsenceModel.findOne({
    guild: ButtonInteract.guildId,
    user: TargetMemberId,
    status: "Approved",
    early_end_date: null,
    end_date: { $gt: NotesSubmission.createdAt },
    "extension_req.status": "Pending",
  });

  if (!ActiveLeave) {
    return PromiseAllThenTrue([
      Callback(InitialCmdInteract),
      new ErrorEmbed()
        .useErrTemplate("LOAExtensionNotFoundForReview")
        .replyToInteract(ButtonInteract, true),
    ]);
  }

  const ActionInPastForm =
    ActionType === "Extension Approval" ? "Extension Approved" : "Extension Denied";
  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle(`Leave of Absence ${ActionInPastForm}`)
    .setDescription(
      `Successfully ${ActionType === "Extension Approval" ? "approved" : "denied"} ${userMention(TargetMemberId)}'s pending leave request.`
    );

  ActiveLeave.extension_req!.status = ActionType === "Extension Approval" ? "Approved" : "Denied";
  ActiveLeave.extension_req!.review_date = NotesSubmission.createdAt;
  ActiveLeave.extension_req!.reviewer_notes =
    NotesSubmission.fields.getTextInputValue("notes") || null;
  ActiveLeave.extension_req!.reviewed_by = {
    id: NotesSubmission.user.id,
    username: NotesSubmission.user.username,
  };

  await ActiveLeave.save();
  return PromiseAllThenTrue([
    Callback(InitialCmdInteract),
    NotesSubmission.editReply({ embeds: [ReplyEmbed] }),
    LOAEventLogger[`Log${ActionType.replace(" ", "")}`](NotesSubmission, ActiveLeave),
  ]);
}

async function Callback(Interaction: CmdOrButtonInteraction) {
  const TargetMember = await GetTargetMember(Interaction);
  if (!TargetMember) return Interaction.isButton() && Interaction.deferUpdate().catch(() => null);
  if (TargetMember.bot) {
    return new ErrorEmbed()
      .useErrTemplate("BotMemberSelected")
      .replyToInteract(Interaction, true, true);
  }

  const LOAData = await GetLOAsData({
    comparison_date: Interaction.createdAt,
    guild_id: Interaction.guildId,
    user_id: TargetMember.id,
  });

  const ActiveOrPendingLOA = LOAData.active_loa ?? LOAData.pending_loa;
  const PanelEmbed = GetPanelEmbed(Interaction, TargetMember, LOAData);
  const PanelComps = GetPanelComponents(Interaction, ActiveOrPendingLOA);
  const ReplyOpts: InteractionReplyOptions = {
    embeds: [PanelEmbed],
    components: PanelComps,
    fetchReply: true,
  };

  const ReplyMessage =
    Interaction.replied || Interaction.deferred
      ? await Interaction.editReply(ReplyOpts)
      : await Interaction.reply(ReplyOpts);

  const CompActionCollector = ReplyMessage.createMessageComponentCollector({
    filter: (i) => i.user.id === Interaction.user.id,
    componentType: ComponentType.Button,
    time: 8 * 60_000,
  });

  CompActionCollector.on("collect", async (ButtonInteract) => {
    try {
      const ActionHandler = HandleAdministrativeInteraction(
        ButtonInteract,
        TargetMember.id,
        Interaction
      );

      if ((await ActionHandler) === true) {
        CompActionCollector.stop("CmdReinstated");
      }
    } catch (Err: any) {
      const ErrorId = RandomString(6, /[\dA-Z]/i);
      AppLogger.error({
        message: "An error occurred while handling button interaction;",
        label: FileLabel,
        error_id: ErrorId,
        stack: Err.stack,
      });

      return new ErrorEmbed()
        .setTitle("Error")
        .setDescription("Something went wrong while handling your request.")
        .setFooter({ text: `Error ID: ${ErrorId}` })
        .replyToInteract(ButtonInteract, true, true, "followUp");
    }
  });

  CompActionCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.match(/\w+Delete/)) return;
    if (EndReason === "NoActiveLeave" || EndReason === "CmdReinstated") return;
    try {
      PanelComps[0].components.forEach((Btn) => Btn.setDisabled(true));
      const LastInteract = Collected.last();
      if (LastInteract) {
        await LastInteract.editReply({ components: PanelComps });
      } else {
        await ReplyMessage.edit({ components: PanelComps });
      }
    } catch (Err: any) {
      AppLogger.error({
        message: "An error occurred while ending the component collector for LOA admin;",
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("admin")
    .setDescription("Manage and administer someone else's active leave of absence.")
    .addUserOption((Option) =>
      Option.setName("member")
        .setDescription("The member to administer their active leave.")
        .setRequired(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;