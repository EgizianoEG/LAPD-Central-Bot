/* eslint-disable sonarjs/cognitive-complexity */
import {
  SlashCommandSubcommandBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  ModalSubmitInteraction,
  InteractionResponse,
  time as FormatTime,
  ButtonInteraction,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  ButtonStyle,
  inlineCode,
  CacheType,
  Message,
} from "discord.js";

import { Emojis } from "@Config/Shared.js";
import { isAfter } from "date-fns";
import { GetErrorId } from "@Utilities/Strings/Random.js";
import { LeaveOfAbsence, Shifts } from "@Typings/Utilities/Database.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed, WarnEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import Dedent from "dedent";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import ShiftModel from "@Models/Shift.js";
import LeaveModel from "@Models/LeaveOfAbsence.js";
import * as Chrono from "chrono-node";
import LOAEventLogger from "@Utilities/Classes/LOAEventLogger.js";
import HumanizeDuration from "humanize-duration";
import MentionCmdByName from "@Utilities/Other/MentionCmd.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";

// ---------------------------------------------------------------------------------------
// File Constants, Types, & Enums:
// -------------------------------
const FileLabel = "Commands:Utility:ServerDataManage";
const ListFormatter = new Intl.ListFormat("en");
const BaseEmbedColor = "#5F9EA0";

type DataDeletionWithDateType = "Before" | "After";
type StringSelectOrButtonInteract<Cached extends CacheType = CacheType> =
  | StringSelectMenuInteraction<Cached>
  | ButtonInteraction<Cached>;

enum DataCategories {
  ShiftData = "sd",
  LeaveData = "ld",
}

enum ShiftDataActions {
  WipeAll = "sd-wa",
  DeletePast = "sd-dp",
  DeleteOfType = "sd-dot",
  DeleteBefore = "sd-db",
  DeleteAfter = "sd-da",
}

enum LeaveDataActions {
  WipeAll = "ld-wa",
  DeletePast = "ld-dpast",
  DeletePending = "ld-DPen",
  DeleteBefore = "ld-db",
  DeleteAfter = "ld-da",
}

// ---------------------------------------------------------------------------------------
// General Helpers:
// ----------------
function GetDataCategoriesDropdownMenu(Interaction: SlashCommandInteraction<"cached">) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`server-data-manage:${Interaction.user.id}:${Interaction.guildId}`)
      .setPlaceholder("Select a category...")
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Shift Data Management")
          .setDescription("Manage the logged shift records and related data.")
          .setValue(DataCategories.ShiftData),
        new StringSelectMenuOptionBuilder()
          .setLabel("Leave of Absence Data Management")
          .setDescription("Manage the logged leave of absence records and related data.")
          .setValue(DataCategories.LeaveData)
      )
  );
}

function GetShiftDataManagementComponents(Interaction: StringSelectOrButtonInteract<"cached">) {
  return [
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setLabel("Wipe All Shift Records")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${ShiftDataActions.WipeAll}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Delete Records of Type")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${ShiftDataActions.DeleteOfType}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Delete Past Shifts")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${ShiftDataActions.DeletePast}:${Interaction.user.id}:${Interaction.guildId}`
        )
    ),
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setLabel("Delete Records Before Date")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${ShiftDataActions.DeleteBefore}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Delete Records After Date")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${ShiftDataActions.DeleteAfter}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Back")
        .setEmoji(Emojis.WhiteBack)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`sdm-back:${Interaction.user.id}:${Interaction.guildId}`)
    ),
  ];
}

function GetLeaveManagementComponenets(Interaction: StringSelectOrButtonInteract<"cached">) {
  return [
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setLabel("Wipe All Leave Records")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${LeaveDataActions.WipeAll}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Delete Pending Requests")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${LeaveDataActions.DeletePending}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Delete Past Records")
        .setStyle(ButtonStyle.Danger)
        .setCustomId(
          `sdm-${LeaveDataActions.DeletePast}:${Interaction.user.id}:${Interaction.guildId}`
        )
    ),
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setLabel("Delete Records Before Date")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
        .setCustomId(
          `sdm-${LeaveDataActions.DeleteBefore}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Delete Records After Date")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
        .setCustomId(
          `sdm-${LeaveDataActions.DeleteAfter}:${Interaction.user.id}:${Interaction.guildId}`
        ),
      new ButtonBuilder()
        .setLabel("Back")
        .setEmoji(Emojis.WhiteBack)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`sdm-back:${Interaction.user.id}:${Interaction.guildId}`)
    ),
  ];
}

function GetDeleteConfirmationComponents(
  Interaction: ButtonInteraction<"cached">,
  TopicID: string
) {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setLabel("Confirm and Delete")
      .setStyle(ButtonStyle.Danger)
      .setCustomId(`${TopicID}-confirm:${Interaction.user.id}:${Interaction.guildId}`),
    new ButtonBuilder()
      .setLabel("Cancel Deletion")
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(`${TopicID}-cancel:${Interaction.user.id}:${Interaction.guildId}`)
  );
}

function GetShiftManagementEmbed() {
  return new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Shift Data Management")
    .setDescription(
      Dedent(`
        Shift data is the shift records that have been logged on the app's database to track staff members' duties and their time invested in working. \
        A new record is created when a staff member starts a new shift using the ${MentionCmdByName("duty manage")} slash command. Use the buttons below to delete records by type, time frame, or status.

        **Options Described:**
        - **Wipe All Shift Records**
          This will delete and erase *all* records of shifts, including active and finished ones, under *any* shift type.
        - **Delete Records of Type**
          An option to delete only shift records under a specified shift type, disregarding whether there are any active shifts or not.
        - **Delete Past Shifts**
          As stated in the title, delete only past shifts that have ended or finished, of any shift type.
        - **Delete Records Before/Since Date**
          An option to delete a set of shifts based on a specific time frame. The start date of the shifts is used for this matter.

        -# This panel will automatically deactivate after 10 minutes of inactivity.
      `)
    );
}

function GetLeaveManagementEmbed() {
  return new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Leave of Absence Data Management")
    .setDescription(
      Dedent(`
        Leave of absence data consists of a set of records, each of which was created upon a staff member's request using the ${MentionCmdByName("loa request")} slash command. \
        This panel provides the ability to delete a set of records based on status or time frame. Use the buttons below to take action on a specific set of records.

        **Options Described:**
        - **Wipe All Leave Records**
          Delete *all* leave records, including active, pending, finished, and cancelled ones.
        - **Delete Pending Requests**
          Delete pending leave requests that have not yet been reviewed, approved, or denied by management.
        - **Delete Past Records**
          This option will delete only leave records that are no longer active and not in a pending state. Only finished and cancelled leaves will be affected.
        - **Delete Records Before/Since Date** (Currently Disabled)
          Delete past, finished, and cancelled leave records based on a specific date, before or after it. The end date (first), review date, or request date is being utilized for this action. Please take into considration that these two options are not accurate at the moment and may result into unexpected deletion of wanted records.
        
        -# This panel will automatically deactivate after 10 minutes of inactivity.
      `)
    );
}

function GetComparisonDateInputModal(
  Interaction: ButtonInteraction<"cached">,
  TargetData: "Shift" | "Leave",
  CDType: DataDeletionWithDateType
) {
  const Modal = new ModalBuilder()
    .setTitle(`Delete ${TargetData} Records ${CDType} Date`)
    .setCustomId(`sdm-dab-input:${Interaction.user.id}:${Interaction.guildId}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("comp_date")
          .setLabel("Comparison Date")
          .setPlaceholder(
            `Enter the date or time expression to delete records ${CDType.toLowerCase()}...`
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(32)
      )
    );

  if (TargetData === "Shift") {
    Modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("shift_type")
          .setLabel("Shift Type")
          .setPlaceholder("The shift type to delete records of (Optional)...")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMinLength(3)
          .setMaxLength(62)
      )
    );
  } else if (TargetData === "Leave") {
    Modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("leave_status")
          .setLabel("Leave Status")
          .setPlaceholder(
            "The leave status to delete records of (Optional), e.g. 'Pending' or 'Ended'."
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMinLength(4)
          .setMaxLength(32)
      )
    );
  }

  return Modal;
}

async function ShowModalAndAwaitSubmission(
  Modal: ModalBuilder,
  Interaction: ButtonInteraction<"cached">,
  TimeoutInMs: number = 5 * 60 * 1000
): Promise<ModalSubmitInteraction<"cached">> {
  await Interaction.showModal(Modal);
  return Interaction.awaitModalSubmit({
    filter: (MS) => MS.customId === Modal.data.custom_id,
    time: TimeoutInMs,
  });
}

async function AwaitDeleteConfirmation(
  RecBtnInteract: ButtonInteraction<"cached">,
  ConfirmationMsg: Message<true>,
  ConfirmationFunc: (ConfirmInteract: ButtonInteraction<"cached">, ...args: any[]) => Promise<any>,
  ...AdditionalCFArgs: any[]
) {
  let ConfirmationInteract: ButtonInteraction<"cached"> | null = null;
  try {
    ConfirmationInteract = await ConfirmationMsg.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (Interact) => Interact.user.id === RecBtnInteract.user.id,
      time: 5 * 60 * 1000,
    });

    if (ConfirmationInteract?.customId.includes("confirm")) {
      return ConfirmationFunc(ConfirmationInteract, ...AdditionalCFArgs);
    } else if (ConfirmationInteract) {
      return ConfirmationInteract.deferUpdate()
        .then(() => ConfirmationInteract?.deleteReply())
        .catch(() => null);
    }
  } catch (Err: any) {
    if (Err?.message.match(/reason: time/)) {
      return RecBtnInteract.deleteReply()
        .catch(() => ConfirmationMsg.delete())
        .catch(() => null);
    } else if (Err?.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion */
      return null;
    } else {
      AppLogger.error({
        label: FileLabel,
        message: "Failed to await confirmation for deletion of records;",
        stack: Err.stack,
      });
    }
  }
}

// ---------------------------------------------------------------------------------------
// Shift Data Mgmt. Helpers:
// -------------------------
function GetSDConfirmationPromptEmbed(Opts: {
  SShiftInfo: Awaited<ReturnType<typeof GetSummarizedShiftInfo>>;
  ShiftTypes?: string[];
  ShiftStatus?: string;
  AfterDate?: Date | null;
  BeforeDate?: Date | null;
}) {
  const { SShiftInfo, ShiftTypes, ShiftStatus, AfterDate, BeforeDate } = Opts;
  const ShiftStatusText = ShiftStatus || "all";
  const RecordedBeforeAfterText = BeforeDate
    ? ` recorded before ${FormatTime(BeforeDate, "D")}`
    : AfterDate
      ? ` recorded after ${FormatTime(AfterDate, "D")}`
      : "";

  let ShiftTypeText: string = "";
  if (Array.isArray(ShiftTypes) && ShiftTypes.length > 1) {
    ShiftTypeText = ` under ${ListFormatter.format(ShiftTypes.map((S) => inlineCode(S)))} shift types`;
  } else if (Array.isArray(ShiftTypes) && Boolean(ShiftTypes[0])) {
    ShiftTypeText = ` under the \`${ShiftTypes[0]}\` shift type`;
  } else if (typeof ShiftTypes === "string" && Boolean(ShiftTypes)) {
    ShiftTypeText = ` under the \`${ShiftTypes}\` shift type`;
  }

  return new WarnEmbed()
    .setThumbnail(null)
    .setTitle("Confirmation Required")
    .setDescription(
      Dedent(`
        **Are you certain you want to delete ${ShiftStatusText} shifts${RecordedBeforeAfterText}${ShiftTypeText}?**
        This will permanently erase \`${SShiftInfo.shift_count}\` shifts totalling around ${HumanizeDuration(SShiftInfo.total_time, { round: true, conjunction: " and " })} of on duty time.

        -# **Note:** This action is ***irreversible***, and data deleted cannot be restored after confirmation. By confirming, you accept full responsibility for this action.
        -# This prompt will automatically cancel after five minutes of inactivity.
      `)
    );
}

function GetShiftTypeInputModal(Interaction: ButtonInteraction<"cached">) {
  return new ModalBuilder()
    .setTitle("Delete Records by Shift Type")
    .setCustomId(
      `sdm-${ShiftDataActions.DeleteOfType}-input:${Interaction.user.id}:${Interaction.guildId}`
    )
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("shift_type")
          .setLabel("Shift Type")
          .setPlaceholder("Enter the shift type to delete records of, e.g., 'Default'...")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(62)
      )
    );
}

async function GetSummarizedShiftInfo(MatchQuery: Mongoose.FilterQuery<Shifts.ShiftDocument>) {
  return ShiftModel.aggregate<{ total_time: number; shift_count: number }>([
    { $match: MatchQuery },
    {
      $group: {
        _id: null,
        total_time: { $sum: "$durations.on_duty" },
        shift_count: { $sum: 1 },
      },
    },
    { $unset: ["_id"] },
  ])
    .exec()
    .then((Docs) => {
      if (Docs?.length) {
        return Docs[0];
      } else {
        return { total_time: 0, shift_count: 0 };
      }
    });
}

async function HandleNoShiftsToTakeActionOn(
  RecInteract: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  SSInfo: Awaited<ReturnType<typeof GetSummarizedShiftInfo>>
) {
  if (SSInfo.shift_count === 0) {
    return new InfoEmbed()
      .setThumbnail(null)
      .setTitle("No Shifts Found")
      .setDescription("There are no shifts found to delete or take action on.")
      .replyToInteract(RecInteract, true, false)
      .then(() => true);
  }

  return false;
}

async function HandleNoShiftsDeletedStatus(
  RecBtnInteract: ButtonInteraction<"cached">,
  SSInfo: Awaited<ReturnType<typeof GetSummarizedShiftInfo>>
) {
  if (SSInfo.shift_count === 0) {
    const ResponseEmbed = new InfoEmbed()
      .setThumbnail(null)
      .setTitle("No Shifts Deleted")
      .setDescription("There were no shifts found that needed to be deleted.");

    if (RecBtnInteract.deferred || RecBtnInteract.replied) {
      return RecBtnInteract.editReply({ embeds: [ResponseEmbed] }).then(() => true);
    } else {
      return RecBtnInteract.update({
        components: [],
        embeds: [ResponseEmbed],
      }).then(() => true);
    }
  }

  return false;
}

async function HandleShiftDataWipeAllConfirm(ConfirmInteract: ButtonInteraction<"cached">) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("SRWipeAllInProgress")],
    components: [],
  });

  const [UpdatedShifTData, DeleteResponse] = await Promise.all([
    GetSummarizedShiftInfo({ guild: ConfirmInteract.guildId }),
    (await ShiftModel.deleteMany({ guild: ConfirmInteract.guildId }).exec()) as any,
  ]);

  Object.assign(DeleteResponse, { totalTime: UpdatedShifTData.total_time });
  if ((await HandleNoShiftsDeletedStatus(ConfirmInteract, UpdatedShifTData)) === true) return;
  return Promise.all([
    ShiftActionLogger.LogShiftsWipe(ConfirmInteract, DeleteResponse),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            "Successfully deleted **`%d`** shift records.",
            DeleteResponse.deletedCount
          ),
      ],
    }),
  ]);
}

async function HandleShiftDataWipeAll(BtnInteract: ButtonInteraction<"cached">) {
  const SummarizedShiftInfo = await GetSummarizedShiftInfo({ guild: BtnInteract.guildId });
  if (await HandleNoShiftsToTakeActionOn(BtnInteract, SummarizedShiftInfo)) return;

  const ConfirmationEmbed = GetSDConfirmationPromptEmbed({ SShiftInfo: SummarizedShiftInfo });
  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${ShiftDataActions.WipeAll}`
  );

  const RespMessage = await BtnInteract.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(BtnInteract, RespMessage, HandleShiftDataWipeAllConfirm);
}

async function HandleShiftDataDeletePastConfirm(ConfirmInteract: ButtonInteraction<"cached">) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("SRDeletionInProgress")],
    components: [],
  });

  const QueryFilter = {
    guild: ConfirmInteract.guildId,
    end_timestamp: { $ne: null },
  };

  const [UpdatedShifTData, DeleteResponse] = await Promise.all([
    GetSummarizedShiftInfo(QueryFilter),
    (await ShiftModel.deleteMany(QueryFilter).exec()) as any,
  ]);

  Object.assign(DeleteResponse, { totalTime: UpdatedShifTData.total_time });
  if (await HandleNoShiftsDeletedStatus(ConfirmInteract, UpdatedShifTData)) return;
  return Promise.all([
    ShiftActionLogger.LogShiftsWipe(ConfirmInteract, DeleteResponse),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            "Successfully deleted **`%d`** past shifts.",
            DeleteResponse.deletedCount
          ),
      ],
    }),
  ]);
}

async function HandleShiftDataDeletePast(BtnInteract: ButtonInteraction<"cached">) {
  const SummarizedShiftInfo = await GetSummarizedShiftInfo({
    guild: BtnInteract.guildId,
    end_timestamp: { $ne: null },
  });

  if (await HandleNoShiftsToTakeActionOn(BtnInteract, SummarizedShiftInfo)) {
    return;
  }

  const ConfirmationEmbed = GetSDConfirmationPromptEmbed({
    SShiftInfo: SummarizedShiftInfo,
    ShiftStatus: "past",
  });

  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${ShiftDataActions.DeletePast}`
  );

  const RespMessage = await BtnInteract.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(BtnInteract, RespMessage, HandleShiftDataDeletePastConfirm);
}

async function HandleShiftDataDeleteOfTypeConfirm(
  ConfirmInteract: ButtonInteraction<"cached">,
  ShiftTypes: string[]
) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("SRDeletionInProgress")],
    components: [],
  });

  const QueryFilter = {
    guild: ConfirmInteract.guildId,
    type: { $in: ShiftTypes },
  };

  const [UpdatedShifTData, DeleteResponse] = await Promise.all([
    GetSummarizedShiftInfo(QueryFilter),
    (await ShiftModel.deleteMany(QueryFilter).exec()) as any,
  ]);

  Object.assign(DeleteResponse, { totalTime: UpdatedShifTData.total_time });
  if (await HandleNoShiftsDeletedStatus(ConfirmInteract, UpdatedShifTData)) return;
  return Promise.all([
    ShiftActionLogger.LogShiftsWipe(ConfirmInteract, DeleteResponse, ShiftTypes),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            "Successfully deleted **`%d`** recorded shifts of type(s): %s",
            DeleteResponse.deletedCount,
            ListFormatter.format(ShiftTypes.map((T) => inlineCode(T)))
          ),
      ],
    }),
  ]);
}

async function HandleShiftDataDeleteOfType(BtnInteract: ButtonInteraction<"cached">) {
  const ShiftTypeInputModal = GetShiftTypeInputModal(BtnInteract);
  const ModalSubmission = await ShowModalAndAwaitSubmission(ShiftTypeInputModal, BtnInteract).catch(
    () => null
  );
  const InputShiftType = ModalSubmission?.fields.getTextInputValue("shift_type").trim();
  const ShiftTypes: string[] = [];

  if (!ModalSubmission) return;
  if (InputShiftType?.includes(",")) {
    ShiftTypes.push(...InputShiftType.split(",").map((Type) => Type.trim()));
  } else if (InputShiftType) {
    ShiftTypes.push(InputShiftType);
  }

  const SummarizedShiftInfo = await GetSummarizedShiftInfo({
    guild: BtnInteract.guildId,
    type: { $in: ShiftTypes },
  });

  if (await HandleNoShiftsToTakeActionOn(ModalSubmission, SummarizedShiftInfo)) {
    return;
  }

  const ConfirmationEmbed = GetSDConfirmationPromptEmbed({
    SShiftInfo: SummarizedShiftInfo,
    ShiftTypes,
  });

  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${ShiftDataActions.DeleteOfType}`
  );

  const RespMessage = await ModalSubmission.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(
    BtnInteract,
    RespMessage,
    HandleShiftDataDeleteOfTypeConfirm,
    ShiftTypes
  );
}

async function HandleShiftDataDeleteWithDateConfirm(
  ConfirmInteract: ButtonInteraction<"cached">,
  ComparisonDate: Date,
  ComparisonType: DataDeletionWithDateType,
  ShiftTypes?: string[]
) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("SRDeletionInProgress")],
    components: [],
  });

  const QueryFilter = {
    guild: ConfirmInteract.guildId,
    type: ShiftTypes?.length ? { $in: ShiftTypes } : { $exists: true },
    start_timestamp:
      ComparisonType === "Before" ? { $lte: ComparisonDate } : { $gte: ComparisonDate },
  };

  const [UpdatedShifTData, DeleteResponse] = await Promise.all([
    GetSummarizedShiftInfo(QueryFilter),
    (await ShiftModel.deleteMany(QueryFilter).exec()) as any,
  ]);

  Object.assign(DeleteResponse, {
    totalTime: UpdatedShifTData.total_time,
    ...(ComparisonType === "Before"
      ? { shiftsBefore: ComparisonDate }
      : { shiftsAfter: ComparisonDate }),
  });

  if (await HandleNoShiftsDeletedStatus(ConfirmInteract, UpdatedShifTData)) return;
  return Promise.all([
    ShiftActionLogger.LogShiftsWipe(ConfirmInteract, DeleteResponse, ShiftTypes),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            "Successfully deleted **`%d`** shifts%s recorded %s.",
            DeleteResponse.deletedCount,
            ShiftTypes?.length
              ? ` of type(s): ${ListFormatter.format(ShiftTypes.map((T) => inlineCode(T)))}`
              : " of all types",
            ComparisonType === "Before"
              ? `before ${FormatTime(ComparisonDate, "D")}`
              : `after ${FormatTime(ComparisonDate, "D")}`
          ),
      ],
    }),
  ]);
}

async function HandleShiftDataDeleteBeforeOrAfterDate(
  BtnInteract: ButtonInteraction<"cached">,
  ComparisonType: DataDeletionWithDateType
) {
  const ComparisonDateModal = GetComparisonDateInputModal(BtnInteract, "Shift", ComparisonType);
  const ModalSubmission = await ShowModalAndAwaitSubmission(ComparisonDateModal, BtnInteract).catch(
    () => null
  );

  const InputDate = ModalSubmission?.fields.getTextInputValue("comp_date").trim();
  const ParsedDate = InputDate ? Chrono.parseDate(InputDate, ModalSubmission?.createdAt) : null;
  const InputShiftType = ModalSubmission?.fields.getTextInputValue("shift_type").trim();
  const ShiftTypes: string[] = [];

  if (!ModalSubmission) return;
  if (InputShiftType?.includes(",")) {
    ShiftTypes.push(...InputShiftType.split(",").map((Type) => Type.trim()));
  } else if (InputShiftType) {
    ShiftTypes.push(InputShiftType);
  }

  if (InputDate && !ParsedDate) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDateFormat")
      .replyToInteract(ModalSubmission, true, false);
  } else if (InputDate && ParsedDate && isAfter(ParsedDate, ModalSubmission.createdAt)) {
    return new ErrorEmbed()
      .useErrTemplate("DateInFuture")
      .replyToInteract(ModalSubmission, true, false);
  }

  const MatchFilter = {
    guild: BtnInteract.guildId,
    type: ShiftTypes.length ? { $in: ShiftTypes } : { $exists: true },
    start_timestamp: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate },
  };

  const SummarizedShiftInfo = await GetSummarizedShiftInfo(MatchFilter);
  if (await HandleNoShiftsToTakeActionOn(ModalSubmission, SummarizedShiftInfo)) return;

  const ConfirmationEmbed = GetSDConfirmationPromptEmbed({
    ShiftTypes,
    SShiftInfo: SummarizedShiftInfo,
    AfterDate: ComparisonType === "After" ? ParsedDate : null,
    BeforeDate: ComparisonType === "Before" ? ParsedDate : null,
  });

  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${ShiftDataActions["Delete" + ComparisonType]}`
  );

  const RespMessage = await ModalSubmission.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(
    BtnInteract,
    RespMessage,
    HandleShiftDataDeleteWithDateConfirm,
    ParsedDate,
    ComparisonType,
    ShiftTypes
  );
}

async function HandleShiftRecordsManagement(
  SMenuInteract: StringSelectMenuInteraction<"cached">,
  CmdInteraction: SlashCommandInteraction<"cached">
) {
  const MsgEmbed = GetShiftManagementEmbed();
  const ManagementComps = GetShiftDataManagementComponents(SMenuInteract);
  const EdittedMessage = await SMenuInteract.update({
    embeds: [MsgEmbed],
    components: ManagementComps,
    fetchReply: true,
  });

  const CompActionCollector = EdittedMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (Interact) => Interact.user.id === SMenuInteract.user.id,
    time: 10 * 60 * 1000,
  });

  CompActionCollector.on("collect", async function OnSDMBtnInteract(BtnInteract) {
    try {
      if (BtnInteract.customId.startsWith("sdm-back")) {
        CompActionCollector.stop("BackToMain");
      } else if (BtnInteract.customId.includes(ShiftDataActions.WipeAll)) {
        await HandleShiftDataWipeAll(BtnInteract);
      } else if (BtnInteract.customId.includes(ShiftDataActions.DeletePast)) {
        await HandleShiftDataDeletePast(BtnInteract);
      } else if (BtnInteract.customId.includes(ShiftDataActions.DeleteOfType)) {
        await HandleShiftDataDeleteOfType(BtnInteract);
      } else if (BtnInteract.customId.includes(ShiftDataActions.DeleteBefore)) {
        await HandleShiftDataDeleteBeforeOrAfterDate(BtnInteract, "Before");
      } else if (BtnInteract.customId.includes(ShiftDataActions.DeleteAfter)) {
        await HandleShiftDataDeleteBeforeOrAfterDate(BtnInteract, "After");
      }

      if (!BtnInteract.deferred && !BtnInteract.replied) {
        return BtnInteract.deferUpdate().catch(() => null);
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      AppLogger.error({
        label: FileLabel,
        message: "Failed to handle shift data management button interaction;",
        error_id: ErrorId,
        stack: Err.stack,
      });

      return new ErrorEmbed()
        .useErrTemplate("UnknownError")
        .setDescription("Something went wrong while handling your request.")
        .setErrorId(ErrorId)
        .replyToInteract(BtnInteract, true, true, "reply");
    }
  });

  CompActionCollector.on("end", async function OnSDMEnd(_, EndReason) {
    if (EndReason.match(/\w+Delete/)) return;
    if (EndReason === "BackToMain") {
      return Callback(CmdInteraction);
    } else if (EndReason.includes("time")) {
      ManagementComps.forEach((ActionRow) =>
        ActionRow.components.forEach((Button) => Button.setDisabled(true))
      );

      return EdittedMessage.edit({
        components: ManagementComps,
      });
    }
  });
}

// ---------------------------------------------------------------------------------------
// Leave Data Mgmt. Helpers:
// -------------------------
function GetLDConfirmationPromptEmbed(Opts: {
  LeaveRecordsCount: number;
  RecordsStatus?: string;
  AfterDate?: Date | null;
  BeforeDate?: Date | null;
}) {
  const { LeaveRecordsCount, RecordsStatus, AfterDate, BeforeDate } = Opts;
  const LeaveStatusText = RecordsStatus || "all";
  const RecordedBeforeAfterText = BeforeDate
    ? ` recorded before ${FormatTime(BeforeDate, "D")}`
    : AfterDate
      ? ` recorded after ${FormatTime(AfterDate, "D")}`
      : "";

  return new WarnEmbed()
    .setThumbnail(null)
    .setTitle("Confirmation Required")
    .setDescription(
      Dedent(`
        **Are you certain you want to delete ${LeaveStatusText} leave records${RecordedBeforeAfterText}?**
        This will permanently erase \`${LeaveRecordsCount}\` leave of absence records.

        -# **Note:** This action is ***irreversible***, and data deleted cannot be restored after confirmation. By confirming, you accept full responsibility for this action.
        -# This prompt will automatically cancel after five minutes of inactivity.
      `)
    );
}

async function HandleNoLeavesToTakeActionOn(
  RecInteract: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  RecordsCount: number,
  InPastForm: boolean = true
) {
  if (RecordsCount === 0) {
    return new InfoEmbed()
      .setThumbnail(null)
      .setTitle("No Leave Records Found")
      .setDescription(
        `There ${InPastForm ? "were" : "are"} no records of leave notices to delete or take action on.`
      )
      .replyToInteract(RecInteract, true, false)
      .then(() => true);
  }

  return false;
}

async function HandleLeaveDataWipeAllConfirm(ConfirmInteract: ButtonInteraction<"cached">) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("LRWipeAllInProgress")],
    components: [],
  });

  const DeleteResponse = await LeaveModel.deleteMany({ guild: ConfirmInteract.guildId }).exec();
  if (await HandleNoLeavesToTakeActionOn(ConfirmInteract, DeleteResponse.deletedCount, true)) {
    return;
  }

  return Promise.all([
    LOAEventLogger.LogLOAsWipe(ConfirmInteract, DeleteResponse),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            "Successfully deleted **`%d`** recorded notices.",
            DeleteResponse.deletedCount
          ),
      ],
    }),
  ]);
}

async function HandleLeaveDataWipeAll(BtnInteract: ButtonInteraction<"cached">) {
  const LeaveRecordsCount = await LeaveModel.countDocuments({ guild: BtnInteract.guildId }).exec();
  if ((await HandleNoLeavesToTakeActionOn(BtnInteract, LeaveRecordsCount, false)) === true) return;

  const ConfirmationEmbed = GetLDConfirmationPromptEmbed({ LeaveRecordsCount });
  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${LeaveDataActions.WipeAll}`
  );

  const RespMessage = await BtnInteract.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(BtnInteract, RespMessage, HandleLeaveDataWipeAllConfirm);
}

async function HandleLeaveDataDeletePastConfirm(ConfirmInteract: ButtonInteraction<"cached">) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("LRDeletionInProgress")],
    components: [],
  });

  const DeleteResponse = await LeaveModel.deleteMany({
    guild: ConfirmInteract.guildId,
    $or: [
      { status: { $in: ["Cancelled", "Denied"] } },
      { status: "Approved", early_end_date: { $lte: ConfirmInteract.createdAt } },
      { status: "Approved", end_date: { $lte: ConfirmInteract.createdAt } },
    ],
  }).exec();

  if (await HandleNoLeavesToTakeActionOn(ConfirmInteract, DeleteResponse.deletedCount, true)) {
    return;
  }

  return Promise.all([
    LOAEventLogger.LogLOAsWipe(
      ConfirmInteract,
      DeleteResponse,
      "Past Notices (Finished, Cancelled, Denied)"
    ),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            "Successfully deleted **`%d`** past records.",
            DeleteResponse.deletedCount
          ),
      ],
    }),
  ]);
}

async function HandleLeaveDataDeletePast(BtnInteract: ButtonInteraction<"cached">) {
  const LeaveRecordsCount = await LeaveModel.countDocuments({
    guild: BtnInteract.guildId,
    $or: [
      { status: { $in: ["Cancelled", "Denied"] } },
      { status: "Approved", early_end_date: { $lte: BtnInteract.createdAt } },
      { status: "Approved", end_date: { $lte: BtnInteract.createdAt } },
    ],
  }).exec();

  if ((await HandleNoLeavesToTakeActionOn(BtnInteract, LeaveRecordsCount, false)) === true) return;
  const ConfirmationEmbed = GetLDConfirmationPromptEmbed({
    LeaveRecordsCount,
    RecordsStatus: "past",
  });

  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${LeaveDataActions.DeletePast}`
  );

  const RespMessage = await BtnInteract.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(BtnInteract, RespMessage, HandleLeaveDataDeletePastConfirm);
}

async function HandleLeaveDataDeletePendingConfirm(ConfirmInteract: ButtonInteraction<"cached">) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("LRDeletionInProgress")],
    components: [],
  });

  const DeleteResponse = await LeaveModel.deleteMany({
    guild: ConfirmInteract.guildId,
    status: "Pending",
    review_date: null,
  }).exec();

  if (await HandleNoLeavesToTakeActionOn(ConfirmInteract, DeleteResponse.deletedCount, true)) {
    return;
  }

  return Promise.all([
    LOAEventLogger.LogLOAsWipe(ConfirmInteract, DeleteResponse, "Pending Requests"),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            "Successfully deleted **`%d`** pending notices.",
            DeleteResponse.deletedCount
          ),
      ],
    }),
  ]);
}

async function HandleLeaveDataDeletePending(BtnInteract: ButtonInteraction<"cached">) {
  const LeaveRecordsCount = await LeaveModel.countDocuments({
    guild: BtnInteract.guildId,
    status: "Pending",
    review_date: null,
  }).exec();

  if ((await HandleNoLeavesToTakeActionOn(BtnInteract, LeaveRecordsCount, false)) === true) return;
  const ConfirmationEmbed = GetLDConfirmationPromptEmbed({
    LeaveRecordsCount,
    RecordsStatus: "pending",
  });

  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${LeaveDataActions.DeletePending}`
  );

  const RespMessage = await BtnInteract.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(BtnInteract, RespMessage, HandleLeaveDataDeletePendingConfirm);
}

async function HandleLeaveDataDeleteWithDateConfirm(
  ConfirmInteract: ButtonInteraction<"cached">,
  ComparisonDate: Date,
  ComparisonType: DataDeletionWithDateType,
  QueryFilter: Mongoose.FilterQuery<LeaveOfAbsence.LeaveOfAbsenceDocument>
) {
  await ConfirmInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("LRDeletionInProgress")],
    components: [],
  });

  const DeleteResponse = await LeaveModel.deleteMany(QueryFilter).exec();
  if (await HandleNoLeavesToTakeActionOn(ConfirmInteract, DeleteResponse.deletedCount, true)) {
    return;
  }

  Object.assign(DeleteResponse, {
    ...(ComparisonType === "Before"
      ? { recordsBefore: ComparisonDate }
      : { recordsAfter: ComparisonDate }),
  });

  return Promise.all([
    LOAEventLogger.LogLOAsWipe(ConfirmInteract, DeleteResponse, "N/A"),
    ConfirmInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription("Successfully deleted **`%d`** records.", DeleteResponse.deletedCount),
      ],
    }),
  ]);
}

async function HandleLeaveDataDeleteBeforeOrAfterDate(
  BtnInteract: ButtonInteraction<"cached">,
  ComparisonType: DataDeletionWithDateType
) {
  const ComparisonDateModal = GetComparisonDateInputModal(BtnInteract, "Leave", ComparisonType);
  const ModalSubmission = await ShowModalAndAwaitSubmission(ComparisonDateModal, BtnInteract).catch(
    () => null
  );

  const InputDate = ModalSubmission?.fields.getTextInputValue("comp_date").trim();
  const ParsedDate = InputDate ? Chrono.parseDate(InputDate, ModalSubmission?.createdAt) : null;
  const InputLeaveStatus = ModalSubmission?.fields.getTextInputValue("leave_status").trim();
  const LeaveStatuses: string[] = [];

  if (!ModalSubmission) return;
  if (InputLeaveStatus?.includes(",")) {
    LeaveStatuses.push(...InputLeaveStatus.split(",").map((Status) => Status.trim()));
  } else if (InputLeaveStatus) {
    LeaveStatuses.push(InputLeaveStatus);
  }

  if (InputDate && !ParsedDate) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDateFormat")
      .replyToInteract(ModalSubmission, true, false);
  } else if (InputDate && ParsedDate && isAfter(ParsedDate, ModalSubmission.createdAt)) {
    return new ErrorEmbed()
      .useErrTemplate("DateInFuture")
      .replyToInteract(ModalSubmission, true, false);
  }

  const MatchFilter: Mongoose.FilterQuery<LeaveOfAbsence.LeaveOfAbsenceDocument> = {
    guild: BtnInteract.guildId,
  };

  if (LeaveStatuses.length === 1) {
    if (/^(?:Finished|Ended|Over)$/i.exec(LeaveStatuses[0])) {
      Object.assign(MatchFilter, {
        status: "Approved",
        $or: [
          {
            early_end_date:
              ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate },
          },
          { end_date: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate } },
        ],
      });
    } else if (/^Pending$/i.exec(LeaveStatuses[0])) {
      Object.assign(MatchFilter, {
        status: "Pending",
        request_date: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate },
      });
    }
  } else if (LeaveStatuses.length > 1) {
    Object.assign(MatchFilter, {
      status: {
        $in: LeaveStatuses.map((Status) => {
          const Trimmed = Status.trim();
          return Trimmed.charAt(0).toUpperCase() + Trimmed.slice(1).toLowerCase();
        }).map((Status) => (Status.match(/^(?:Finished|Ended|Over)$/i) ? "Approved" : Status)),
      },
      $or: [
        {
          early_end_date: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate },
        },
        { end_date: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate } },
      ],
    });
  } else {
    Object.assign(MatchFilter, {
      $or: [
        {
          status: "Approved",
          early_end_date: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate },
        },
        {
          status: "Approved",
          end_date: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate },
        },
        {
          status: "Pending",
          request_date: ComparisonType === "Before" ? { $lte: ParsedDate } : { $gte: ParsedDate },
        },
      ],
    });
  }

  const LeaveRecordsCount = await LeaveModel.countDocuments(MatchFilter);
  if ((await HandleNoLeavesToTakeActionOn(BtnInteract, LeaveRecordsCount, false)) === true) {
    return;
  }

  const ConfirmationEmbed = GetLDConfirmationPromptEmbed({
    LeaveRecordsCount,
    RecordsStatus: LeaveStatuses.length ? ListFormatter.format(LeaveStatuses) : undefined,
    AfterDate: ComparisonType === "After" ? ParsedDate : null,
    BeforeDate: ComparisonType === "Before" ? ParsedDate : null,
  });

  const ConfirmationComponents = GetDeleteConfirmationComponents(
    BtnInteract,
    `sdm-${LeaveDataActions["Delete" + ComparisonType]}`
  );

  const RespMessage = await ModalSubmission.reply({
    embeds: [ConfirmationEmbed],
    components: [ConfirmationComponents],
    fetchReply: true,
  });

  return AwaitDeleteConfirmation(
    BtnInteract,
    RespMessage,
    HandleLeaveDataDeleteWithDateConfirm,
    ParsedDate,
    ComparisonType,
    MatchFilter
  );
}

async function HandleLeaveRecordsManagement(
  SMenuInteract: StringSelectMenuInteraction<"cached">,
  CmdInteraction: SlashCommandInteraction<"cached">
) {
  const MsgEmbed = GetLeaveManagementEmbed();
  const ManagementComps = GetLeaveManagementComponenets(SMenuInteract);
  const EdittedMessage = await SMenuInteract.update({
    embeds: [MsgEmbed],
    components: ManagementComps,
    fetchReply: true,
  });

  const CompActionCollector = EdittedMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (Interact) => Interact.user.id === SMenuInteract.user.id,
    time: 10 * 60 * 1000,
  });

  CompActionCollector.on("collect", async function OnLDMBtnInteract(BtnInteract) {
    try {
      if (BtnInteract.customId.startsWith("sdm-back")) {
        CompActionCollector.stop("BackToMain");
      } else if (BtnInteract.customId.includes(LeaveDataActions.WipeAll)) {
        await HandleLeaveDataWipeAll(BtnInteract);
      } else if (BtnInteract.customId.includes(LeaveDataActions.DeletePast)) {
        await HandleLeaveDataDeletePast(BtnInteract);
      } else if (BtnInteract.customId.includes(LeaveDataActions.DeletePending)) {
        await HandleLeaveDataDeletePending(BtnInteract);
      } else if (BtnInteract.customId.includes(LeaveDataActions.DeleteBefore)) {
        await HandleLeaveDataDeleteBeforeOrAfterDate(BtnInteract, "Before");
      } else if (BtnInteract.customId.includes(LeaveDataActions.DeleteAfter)) {
        await HandleLeaveDataDeleteBeforeOrAfterDate(BtnInteract, "After");
      }

      if (!BtnInteract.deferred && !BtnInteract.replied) {
        return BtnInteract.deferUpdate().catch(() => null);
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      AppLogger.error({
        label: FileLabel,
        message: "Failed to handle shift data management button interaction;",
        error_id: ErrorId,
        stack: Err.stack,
      });

      return new ErrorEmbed()
        .useErrTemplate("UnknownError")
        .setDescription("Something went wrong while handling your request.")
        .setErrorId(ErrorId)
        .replyToInteract(BtnInteract, true, true, "reply");
    }
  });

  CompActionCollector.on("end", async function OnLDMEnd(_, EndReason) {
    if (EndReason.match(/\w+Delete/)) return;
    if (EndReason === "BackToMain") {
      return Callback(CmdInteraction);
    } else if (EndReason.includes("time")) {
      ManagementComps.forEach((ActionRow) =>
        ActionRow.components.forEach((Button) => Button.setDisabled(true))
      );

      return SMenuInteract.update({
        components: ManagementComps,
      });
    }
  });
}

// ---------------------------------------------------------------------------------------
// Initial Handlers:
// -----------------
async function HandleInitialRespActions(
  CmdInteract: SlashCommandInteraction<"cached">,
  CmdRespMsg: Message<true> | InteractionResponse<true>,
  SMenuDisabler: () => Promise<any>
) {
  return CmdRespMsg.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  })
    .then(async function OnDataCategorySelection(TopicSelectInteract) {
      const SelectedDataTopic = TopicSelectInteract.values[0];

      if (SelectedDataTopic === DataCategories.ShiftData) {
        return HandleShiftRecordsManagement(TopicSelectInteract, CmdInteract);
      } else if (SelectedDataTopic === DataCategories.LeaveData) {
        return HandleLeaveRecordsManagement(TopicSelectInteract, CmdInteract);
      }
    })
    .catch((Err) => HandleActionCollectorExceptions(Err, SMenuDisabler));
}

async function Callback(CmdInteraction: SlashCommandInteraction<"cached">) {
  const CmdRespEmbed = new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Server Data Management")
    .setDescription("**Please select a data category from the drop-down list below to continue.**");

  const CTopicsMenu = GetDataCategoriesDropdownMenu(CmdInteraction);
  const ReplyMethod = CmdInteraction.replied || CmdInteraction.deferred ? "editReply" : "reply";
  const CmdRespMsg = await CmdInteraction[ReplyMethod]({
    embeds: [CmdRespEmbed],
    components: [CTopicsMenu],
    fetchReply: true,
  });

  const PromptDisabler = () => {
    CTopicsMenu.components[0].setDisabled(true);
    return CmdInteraction.editReply({
      components: [CTopicsMenu],
    });
  };

  return HandleInitialRespActions(CmdInteraction, CmdRespMsg, PromptDisabler);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("manage")
    .setDescription("Manage logged server data, including shift and leave of absence records."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
