/* eslint-disable sonarjs/no-duplicate-string */
import {
  SlashCommandSubcommandBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  ModalSubmitInteraction,
  time as FormatTime,
  TextDisplayBuilder,
  ButtonInteraction,
  ActionRowBuilder,
  ContainerBuilder,
  TextInputBuilder,
  SeparatorBuilder,
  DiscordAPIError,
  TextInputStyle,
  ButtonBuilder,
  ComponentType,
  ModalBuilder,
  EmbedBuilder,
  MessageFlags,
  resolveColor,
  ButtonStyle,
  channelLink,
  Message,
  User,
} from "discord.js";

import { Shifts } from "@Typings/Utilities/Database.js";
import { milliseconds } from "date-fns";
import { RandomString } from "@Utilities/Strings/Random.js";
import { IsValidShiftId } from "@Utilities/Other/Validators.js";
import { Colors, Emojis } from "@Config/Shared.js";
import { AggregateResults, Shifts } from "@Typings/Utilities/Database.js";
import { HandleShiftTypeValidation } from "@Utilities/Database/ShiftTypeValidators.js";
import { SuccessEmbed, InfoEmbed, WarnEmbed, ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import ShiftModel, { ShiftFlags } from "@Models/Shift.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import HandlePagePagination from "@Utilities/Other/HandlePagePagination.js";
import HandleRoleAssignment from "@Utilities/Other/HandleShiftRoleAssignment.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import ParseDuration from "parse-duration";
import DHumanize from "humanize-duration";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import Chunks from "@Utilities/Other/SliceIntoChunks.js";
import Dedent from "dedent";

const FileLabel = "Commands:Miscellaneous:Duty:Admin";
const TimeModPlaceholders = [
  "E.g., 1 hour, and 34 minutes...",
  "E.g., 80 minutes and 30 seconds...",
  "E.g., 45 minutes",
  "E.g., 3hrs, 15m",
  "E.g., 2hrs",
];

const HumanizeDuration = DHumanize.humanizer({
  conjunction: " and ",
  largest: 3,
  round: true,
});

enum ShiftModActions {
  TimeSet = "set",
  TimeAdd = "add",
  TimeSub = "sub",
  TimeReset = "reset",
}

// ---------------------------------------------------------------------------------------
// Helpers:
// --------
/**
 * Generates two rows of action buttons for shift administration.
 * @param ShiftActive - Indicates whether a shift is currently active. Can be a hydrated shift document, a boolean, or null.
 * @param Interaction - The interaction object, either a `SlashCommandInteraction` or `ButtonInteraction`.
 * @returns An array containing two `ActionRowBuilder` instances, each populated
 *          with `ButtonBuilder` components for various shift administration actions.
 */
function GetShiftAdminButtonsRows(
  ShiftActive: Shifts.HydratedShiftDocument | boolean | null,
  Interaction: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">
) {
  const ActionRowOne = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("da-list")
      .setLabel("List")
      .setEmoji(Emojis.HamburgerList)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("da-modify")
      .setLabel("Modify")
      .setEmoji(Emojis.FileEdit)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("da-wipe")
      .setLabel("Wipe Shifts")
      .setDisabled(false)
      .setEmoji(Emojis.Trash)
      .setStyle(ButtonStyle.Danger)
  ) as ActionRowBuilder<ButtonBuilder & { data: { custom_id: string } }>;

  const ActionRowTwo = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("da-create")
      .setLabel("Create Shift")
      .setEmoji(Emojis.WhitePlus)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("da-end")
      .setLabel("End")
      .setDisabled(!ShiftActive)
      .setEmoji(Emojis.TimeClockOut)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("da-delete")
      .setLabel("Delete")
      .setEmoji(Emojis.FileDelete)
      .setStyle(ButtonStyle.Danger)
  ) as ActionRowBuilder<ButtonBuilder & { data: { custom_id: string } }>;

  ActionRowOne.components.forEach((Comp) =>
    Comp.setCustomId(`${Comp.data.custom_id}:${Interaction.user.id}`)
  );

  ActionRowTwo.components.forEach((Comp) =>
    Comp.setCustomId(`${Comp.data.custom_id}:${Interaction.user.id}`)
  );

  return [ActionRowOne, ActionRowTwo];
}

/**
 * Generates a modal for modifying shift time with options to add, subtract, or set the time.
 * @param ActionType - The type of action to perform on the shift time. Can be "Add", "Subtract", or "Set".
 * @param AdminInteract - The interaction object representing the admin's selection menu interaction.
 * @param ShiftDocument - The document containing shift details, including the current on-duty duration.
 * @returns A `ModalBuilder` instance configured for shift time modification.
 */
function GetTimeModificationModal(
  ActionType: "Add" | "Subtract" | "Set",
  AdminInteract: StringSelectMenuInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  const TimeModificationModal = new ModalBuilder()
    .setCustomId(`da-time-mod:${AdminInteract.user.id}:${RandomString(4)}`)
    .setTitle("Shift Time Modification")
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("da-st-mod-input")
          .setLabel(`Shift Time To ${ActionType}`)
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(50)
          .setPlaceholder(
            TimeModPlaceholders[Math.floor(Math.random() * TimeModPlaceholders.length)]
          )
      )
    );

  if (ActionType === "Set") {
    const PrefilledInput = HumanizeDuration(ShiftDocument.durations.on_duty);
    if (PrefilledInput.length <= 50) {
      TimeModificationModal.components[0].components[0].setValue(
        HumanizeDuration(ShiftDocument.durations.on_duty)
      );
    }
  }

  return TimeModificationModal;
}

/**
 * Generates a modal for creating an administrative shift.
 * @param AdminInteract - The button interaction initiated by the admin user.
 * @param ShiftType - The type of shift to prefill in the modal (optional).
 * @returns A configured `ModalBuilder` instance for the shift creation process.
 */
function GetShiftCreationModal(
  AdminInteract: ButtonInteraction<"cached">,
  ShiftType: Nullable<string>
) {
  return new ModalBuilder()
    .setCustomId(`da-create-shift:${AdminInteract.user.id}:${RandomString(4)}`)
    .setTitle("Create Administrative Shift")
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("shift-duration")
          .setLabel("Shift Duration")
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(50)
          .setRequired(true)
          .setPlaceholder(
            TimeModPlaceholders[Math.floor(Math.random() * TimeModPlaceholders.length)]
          )
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("shift-type")
          .setLabel("Shift Type")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("The shift type to use...")
          .setValue(ShiftType ?? "Default")
          .setMinLength(3)
          .setMaxLength(20)
          .setRequired(true)
      )
    );
}

/**
 * Handles exceptions that occur during the modification of shift times.
 * @param Interact - The interaction object, which can be either a `StringSelectMenuInteraction` or `ModalSubmitInteraction` with a cached state.
 * @param ShiftDoc - The shift document associated with the operation, represented as a hydrated shift document.
 * @param Err - The error object that was thrown during the operation. Can be of any type.
 * @remarks
 * - If the error is an instance of `AppError` and is marked as showable, it will be displayed to the user via an error embed.
 * - For other errors, a generic error embed will be sent to the user, and the error details will be logged for future reference.
 *
 * @throws This function does not throw errors but logs them and replies to the interaction with an appropriate error message.
 */
async function HandleShiftTimeModExceptions(
  Interact: StringSelectMenuInteraction<"cached"> | ModalSubmitInteraction<"cached">,
  ShiftDoc: Shifts.HydratedShiftDocument,
  Err: any
) {
  if (Err instanceof AppError && Err.is_showable) {
    return new ErrorEmbed().useErrClass(Err).replyToInteract(Interact, true);
  }

  await new ErrorEmbed().useErrTemplate("AppError").replyToInteract(Interact, true);
  AppLogger.error({
    label: FileLabel,
    message: "Failed to modify shift time;",
    shift: ShiftDoc.toObject({ getters: true }),
    stack: Err.stack,
  });
}

/**
 * Handles the reset of a shift's on-duty time for administrative purposes.
 * @param AdminInteract - The interaction object representing the admin's selection menu interaction.
 * @param ShiftDocument - The document representing the shift to be modified.
 * @returns A promise that resolves when all operations (logging and user feedback) are settled.
 *          If an error occurs, it delegates to the exception handler for shift time modifications.
 */
async function HandleShiftTimeReset(
  AdminInteract: StringSelectMenuInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  try {
    const UpdatedDoc = await ShiftDocument.resetOnDutyTime(AdminInteract.createdTimestamp);
    return Promise.allSettled([
      ShiftActionLogger.LogShiftTimeReset(AdminInteract, ShiftDocument, UpdatedDoc),
      new SuccessEmbed()
        .setDescription("Successfully reset the shift's on-duty time.")
        .replyToInteract(AdminInteract, true),
    ]);
  } catch (Err: any) {
    return HandleShiftTimeModExceptions(AdminInteract, ShiftDocument, Err);
  }
}

/**
 * Handles the process of setting the on-duty time for a shift.
 * @param AdminInteract - The interaction object from the admin's selection menu.
 * @param ShiftDocument - The shift document representing the current shift data.
 * @returns A promise that resolves when the operation is complete, or logs errors if any occur.
 */
async function HandleShiftTimeSet(
  AdminInteract: StringSelectMenuInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  const TMModal = GetTimeModificationModal("Set", AdminInteract, ShiftDocument);
  await AdminInteract.showModal(TMModal);
  const ModalSubmission = await AdminInteract.awaitModalSubmit({
    filter: (MS) => MS.user.id === AdminInteract.user.id && MS.customId === TMModal.data.custom_id,
    time: 5 * 60 * 1000,
  }).catch(() => null);

  if (!ModalSubmission) return;
  const InputDuration = ModalSubmission.fields.getTextInputValue("da-st-mod-input");
  const ParsedDuration = ParseDuration(InputDuration, "millisecond");
  const RoundedDuration = Math.round(ParsedDuration ?? 0);

  if (!ParsedDuration) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDurationExp")
      .replyToInteract(ModalSubmission, true);
  } else if (RoundedDuration < 30_000) {
    return new ErrorEmbed()
      .useErrTemplate("ShortTypedDuration")
      .replyToInteract(ModalSubmission, true);
  }

  try {
    const UpdatedDoc = await ShiftDocument.setOnDutyTime(
      RoundedDuration,
      ModalSubmission.createdTimestamp
    );

    return Promise.allSettled([
      ShiftActionLogger.LogShiftTimeSet(ModalSubmission, ShiftDocument, UpdatedDoc),
      new SuccessEmbed()
        .setDescription(
          `Successfully set the shift's on-duty time to ${HumanizeDuration(UpdatedDoc.durations.on_duty)}.`
        )
        .replyToInteract(ModalSubmission, true),
    ]);
  } catch (Err: any) {
    return HandleShiftTimeModExceptions(ModalSubmission, ShiftDocument, Err);
  }
}

/**
 * Handles the addition or subtraction of on-duty time for a shift document.
 * @param ActionType - Specifies whether to "Add" or "Subtract" on-duty time.
 * @param AdminInteract - The interaction object from the admin user, specifically a string select menu interaction.
 * @param ShiftDocument - The shift document to be modified, containing the current shift data.
 *
 * @returns A promise that resolves when the operation is completed, including sending a success or error message
 *          to the user and logging the action. If an error occurs, it handles the exception appropriately.
 * @throws If the duration input is invalid or too short, an error embed is sent as a reply to the interaction.
 *         Other exceptions are handled by `HandleShiftTimeModExceptions`.
 */
async function HandleShiftTimeAddSub(
  ActionType: "Add" | "Subtract",
  AdminInteract: StringSelectMenuInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  const TMModal = GetTimeModificationModal(ActionType, AdminInteract, ShiftDocument);
  await AdminInteract.showModal(TMModal);
  const ModalSubmission = await AdminInteract.awaitModalSubmit({
    filter: (MS) => MS.user.id === AdminInteract.user.id && MS.customId === TMModal.data.custom_id,
    time: 5 * 60 * 1000,
  }).catch(() => null);

  if (!ModalSubmission) return;
  const InputDuration = ModalSubmission.fields.getTextInputValue("da-st-mod-input");
  const ParsedDuration = ParseDuration(InputDuration, "millisecond");
  const RoundedDuration = Math.round(ParsedDuration ?? 0);
  const SuccessMsg =
    ActionType === "Add"
      ? `Successfully added an extra \`${HumanizeDuration(RoundedDuration)}\` of on-duty time to the shift.`
      : `Successfully subtracted \`${HumanizeDuration(RoundedDuration)}\` of on-duty time from the shift.`;

  if (!ParsedDuration) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDurationExp")
      .replyToInteract(ModalSubmission, true);
  } else if (RoundedDuration < milliseconds({ seconds: 30 })) {
    return new ErrorEmbed()
      .useErrTemplate("ShortTypedDuration")
      .replyToInteract(ModalSubmission, true);
  }

  try {
    const UpdatedDoc = await ShiftDocument.addSubOnDutyTime(ActionType, RoundedDuration);
    return Promise.allSettled([
      new SuccessEmbed().setDescription(SuccessMsg).replyToInteract(ModalSubmission, true),
      ShiftActionLogger.LogShiftTimeAddSub(
        ModalSubmission,
        UpdatedDoc,
        RoundedDuration,
        ActionType
      ),
    ]);
  } catch (Err: any) {
    return HandleShiftTimeModExceptions(ModalSubmission, ShiftDocument, Err);
  }
}

/**
 * Prompts the user to modify a shift by selecting an action from a menu.
 * @param Interact - The interaction object, either a modal submit or button interaction.
 * @param ShiftDocument - The shift document to be modified.
 * @remarks
 * This function handles user interaction for modifying shift details, including adding, subtracting, setting, or resetting on-duty time.
 */
async function PromptShiftModification(
  Interact: ModalSubmitInteraction<"cached"> | ButtonInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  if (Interact.isModalSubmit() && !Interact.deferred) await Interact.deferUpdate();
  const ActionOptions = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`da-modify-actions:${Interact.user.id}:${ShiftDocument._id}`)
      .setPlaceholder("Select an action")
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Add Time")
          .setEmoji(Emojis.ClockPlus)
          .setValue(ShiftModActions.TimeAdd)
          .setDescription("Add extra on duty time to the shift."),
        new StringSelectMenuOptionBuilder()
          .setValue("sub")
          .setLabel("Subtract Time")
          .setEmoji(Emojis.ClockMinus)
          .setValue(ShiftModActions.TimeSub)
          .setDescription("Subtract and remove on duty time from the shift."),
        new StringSelectMenuOptionBuilder()
          .setValue("set")
          .setLabel("Set Time")
          .setEmoji(Emojis.ClockSet)
          .setValue(ShiftModActions.TimeSet)
          .setDescription("Set the shift's on-duty time, disregarding the current time."),
        new StringSelectMenuOptionBuilder()
          .setValue("reset")
          .setLabel("Reset Time")
          .setEmoji(Emojis.ClockReset)
          .setValue(ShiftModActions.TimeReset)
          .setDescription("Reset the shift's on-duty time as if it had just begun.")
      )
  );

  const PromptEmbed = new EmbedBuilder()
    .setColor(Colors.Greyple)
    .setTitle(`Shift Modifier — \`${ShiftDocument._id}\``)
    .setDescription(
      "Kindly select an action to perform on the specified shift from the below options."
    );

  const Prompt = await Interact.editReply({ embeds: [PromptEmbed], components: [ActionOptions] });
  const CompCollector = Prompt.createMessageComponentCollector({
    filter: (BInteract) => HandleCollectorFiltering(Interact, BInteract),
    componentType: ComponentType.StringSelect,
    time: 10 * 60_000,
  });

  CompCollector.on("collect", async (SMInteract: StringSelectMenuInteraction<"cached">) => {
    if (SMInteract.values[0] === ShiftModActions.TimeReset) {
      await HandleShiftTimeReset(SMInteract, ShiftDocument);
    } else if (SMInteract.values[0] === ShiftModActions.TimeSet) {
      await HandleShiftTimeSet(SMInteract, ShiftDocument);
    } else if (SMInteract.values[0] === ShiftModActions.TimeAdd) {
      await HandleShiftTimeAddSub("Add", SMInteract, ShiftDocument);
    } else if (SMInteract.values[0] === ShiftModActions.TimeSub) {
      await HandleShiftTimeAddSub("Subtract", SMInteract, ShiftDocument);
    }

    Interact.editReply({ components: [ActionOptions] }).catch(() => null);
    const UpdatedDocument = await ShiftDocument.getLatestVersion(true).catch((Err) => {
      if (Err instanceof AppError && Err.is_showable) {
        return new ErrorEmbed()
          .useErrClass(Err)
          .replyToInteract(SMInteract, true)
          .finally(() => null);
      } else {
        return new ErrorEmbed()
          .useErrTemplate("AppError")
          .replyToInteract(SMInteract, true)
          .finally(() => null);
      }
    });

    if (UpdatedDocument) {
      ShiftDocument = UpdatedDocument as Shifts.HydratedShiftDocument;
    }
  });

  CompCollector.on("end", async (CollectedInteracts, EndReason) => {
    if (EndReason.match(/^\w+Delete/)) return;
    try {
      const LastInteract = CollectedInteracts.last() ?? Interact;
      ActionOptions.components.forEach((Comp) => Comp.setDisabled(true));
      await LastInteract.editReply({ components: [ActionOptions] });
    } catch (Err: any) {
      AppLogger.debug({
        message: "Non-critical error occurred in component collector end handler; ignored.",
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });
}

/**
 * Wipes all shifts for a specified user in a given guild, optionally filtered by shift type.
 * @param TargetUserId - The ID of the user whose shifts are to be wiped.
 * @param GuildId - The ID of the guild where the shifts are recorded.
 * @param ShiftType - (Optional) The type of shifts to delete. If not provided, all shift types are considered.
 * @returns A promise that resolves to an object containing the total time of the deleted shifts and the result of the delete operation.
 */
async function WipeUserShifts(
  TargetUserId: string,
  GuildId: string,
  ShiftType?: Nullable<string>
): Promise<Mongoose.mongo.DeleteResult & { totalTime: number }> {
  const QueryFilter = {
    guild: GuildId,
    user: TargetUserId,
    type: ShiftType ?? { $exists: true },
  };

  const TData: { totalTime: number }[] = await ShiftModel.aggregate([
    { $match: QueryFilter },
    { $group: { _id: null, totalTime: { $sum: "$durations.on_duty" } } },
    { $unset: ["_id"] },
  ]);

  if (TData[0]?.totalTime === 0) {
    return {
      totalTime: 0,
      acknowledged: true,
      deletedCount: 0,
    };
  }

  return ShiftModel.deleteMany(QueryFilter).then((DResult: any) => {
    DResult.totalTime = TData[0]?.totalTime ?? 0;
    return DResult as Mongoose.mongo.DeleteResult & { totalTime: number };
  });
}

/**
 * Returns a paginated and listed shifts of a target user.
 * Aggregation test: https://mongoplayground.net/p/PwnbTQVfPBy
 * @param TargetUser - The targetted user.
 * @param GuildId - The guild id that the user is in.
 * @param [ShiftType] - Shift type targetted.
 * @param [CurrentDate=new Date()] - The current date to use for calculating shift durations.
 * @returns
 */
async function RetrieveShiftRecordsAsEmbeds(
  TargetUser: User,
  GuildId: string,
  ShiftType: Nullable<string>,
  CurrentDate: Date = new Date()
) {
  const ShiftData: AggregateResults.DutyAdminShiftRecordsShow[] = await ShiftModel.aggregate([
    {
      $match: {
        user: TargetUser.id,
        guild: GuildId,
        type: ShiftType || { $exists: true },
      },
    },
    {
      $project: {
        _id: 1,
        type: 1,
        flag: 1,
        started: {
          $toLong: {
            $toDate: "$start_timestamp",
          },
        },
        ended: {
          $cond: [
            {
              $eq: ["$end_timestamp", null],
            },
            "Currently Active",
            {
              $toLong: {
                $toDate: "$end_timestamp",
              },
            },
          ],
        },
        duration: {
          $add: [
            {
              $ifNull: ["$durations.on_duty_mod", 0],
            },
            {
              $cond: [
                {
                  $eq: ["$end_timestamp", null],
                },
                {
                  $subtract: [
                    CurrentDate,
                    {
                      $toDate: "$start_timestamp",
                    },
                  ],
                },
                {
                  $subtract: [
                    {
                      $toDate: "$end_timestamp",
                    },
                    {
                      $toDate: "$start_timestamp",
                    },
                  ],
                },
              ],
            },
          ],
        },
        break_duration: {
          $reduce: {
            input: "$events.breaks",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $subtract: [
                    {
                      $toLong: {
                        $ifNull: [
                          {
                            $arrayElemAt: ["$$this", 1],
                          },
                          CurrentDate,
                        ],
                      },
                    },
                    {
                      $toLong: {
                        $arrayElemAt: ["$$this", 0],
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        duration: {
          $subtract: ["$duration", "$break_duration"],
        },
      },
    },
    {
      $sort: {
        started: -1,
      },
    },
  ]).exec();

  return Chunks(ShiftData, 2).map((Chunk) => {
    const Descriptions = Chunk.map((Data) => {
      const Started = FormatTime(Math.round(Data.started / 1000), "f");
      const Ended =
        typeof Data.ended === "string"
          ? Data.ended
          : FormatTime(Math.round(Data.started / 1000), "T");

      const AdminFlag = Data.flag === ShiftFlags.Administrative ? " (Manually Added)" : "";
      const ShiftIdLine = `**Shift ID:** \`${Data._id}\`${AdminFlag}`;
      if (ShiftType) {
        return Dedent(`
          - ${ShiftIdLine}
            - **Duration:** ${HumanizeDuration(Data.duration)}
            - **Started:** ${Started}
            - **Ended:** ${Ended}
        `);
      } else {
        return Dedent(`
          - ${ShiftIdLine}
            - **Type:** \`${Data.type}\`
            - **Duration:** ${HumanizeDuration(Data.duration)}
            - **Started:** ${Started}
            - **Ended:** ${Ended}
        `);
      }
    });

    const ShiftTypeAppend = ShiftType ? `type: ${ShiftType}` : "all types";
    const PageContainer = new ContainerBuilder()
      .setAccentColor(resolveColor(Colors.Info))
      .addTextDisplayComponents(
        new TextDisplayBuilder({
          content: `### Recorded Shifts\n-# Displaying \`${ShiftData.length}\` total shifts of ${ShiftTypeAppend}; data as of ${FormatTime(CurrentDate, "f")}`,
        })
      )
      .addSeparatorComponents(new SeparatorBuilder({ divider: true, spacing: 2 }));

    Descriptions.forEach((Description, Index) => {
      PageContainer.addTextDisplayComponents(
        new TextDisplayBuilder({
          content: Description,
        })
      );

      if (Index !== Descriptions.length - 1) {
        PageContainer.addSeparatorComponents(new SeparatorBuilder({ divider: true }));
      }
    });

    return PageContainer;
  });
}

// ---------------------------------------------------------------------------------------
// Action Handlers:
// ----------------
/**
 * Handles modification logic to selected shifts.
 * @param Interaction - The button interaction that triggered the function.
 * @param TargetUser - The user whose shift is being modified.
 */
async function HandleShiftModifications(
  Interaction: ButtonInteraction<"cached">,
  TargetUser: User,
  ShiftType?: string | null
) {
  if (
    (await ShiftModel.countDocuments({
      guild: Interaction.guildId,
      user: TargetUser.id,
      type: ShiftType || { $exists: true },
    })) === 0
  ) {
    return new ErrorEmbed()
      .useErrTemplate(ShiftType ? "SANoShiftsToModifyWithType" : "SANoShiftsToModify")
      .replyToInteract(Interaction, true);
  }

  const IsShiftActive = !!(await GetShiftActive({
    ShiftType,
    UserOnly: true,
    Interaction: {
      guildId: Interaction.guildId,
      user: { id: TargetUser.id },
    },
  }));

  const CurrLastBtn = IsShiftActive ? "Current" : "Last";
  const RespEmbed = new EmbedBuilder()
    .setColor(Colors.Greyple)
    .setTitle("Shift Modifier")
    .setDescription("Please select a shift to modify its durations.");

  const ButtonsActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`da-modify-${CurrLastBtn.toLowerCase()}:${Interaction.user.id}`)
      .setLabel(`Select ${CurrLastBtn} Shift`)
      .setDisabled(false)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`da-modify-id:${Interaction.user.id}`)
      .setLabel("Select By Shift ID")
      .setDisabled(false)
      .setStyle(ButtonStyle.Secondary)
  );

  const Message = await Interaction.reply({
    components: [ButtonsActionRow],
    embeds: [RespEmbed],
    flags: MessageFlags.Ephemeral,
    withResponse: true,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  const CompCollector = Message.createMessageComponentCollector({
    filter: (BInteract) => HandleCollectorFiltering(Interaction, BInteract),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  });

  CompCollector.on("collect", async (ButtonInteract) => {
    if (ButtonInteract.customId.includes("da-modify-current")) {
      await ButtonInteract.deferUpdate();
      const ActiveShift = await GetShiftActive({
        ShiftType,
        UserOnly: true,
        Interaction: {
          guildId: Interaction.guildId,
          user: { id: TargetUser.id },
        },
      });

      if (!ActiveShift) {
        return new ErrorEmbed()
          .useErrTemplate("NoActiveShiftFM")
          .replyToInteract(ButtonInteract, true, false, "reply");
      }

      CompCollector.stop();
      return PromptShiftModification(ButtonInteract, ActiveShift);
    }

    if (ButtonInteract.customId.includes("da-modify-last")) {
      await ButtonInteract.deferUpdate();
      const LastShift = await ShiftModel.findOne({
        guild: Interaction.guildId,
        user: TargetUser.id,
        type: ShiftType || { $exists: true },
      })
        .sort({ start_timestamp: -1 })
        .exec();

      if (!LastShift) {
        return new ErrorEmbed()
          .useErrTemplate("NoRecentShifts")
          .replyToInteract(ButtonInteract, true, false, "reply");
      }

      CompCollector.stop();
      return PromptShiftModification(ButtonInteract, LastShift);
    }

    const ShiftIdModal = new ModalBuilder()
      .setTitle("Shift Modification")
      .setCustomId(`da-modify-id-getter:${ButtonInteract.user.id}:${RandomString(4)}`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setLabel("Shift ID")
            .setPlaceholder("Please fill in the 15-character numeric shift id.")
            .setCustomId("da-modify-id")
            .setRequired(true)
            .setMinLength(15)
            .setMaxLength(15)
            .setStyle(TextInputStyle.Short)
        )
      );

    await ButtonInteract.showModal(ShiftIdModal);
    const ModalSubmission = await ButtonInteract.awaitModalSubmit({
      filter: (MS: ModalSubmitInteraction) =>
        MS.user.id === ButtonInteract.user.id && MS.customId === ShiftIdModal.data.custom_id,
      time: 5 * 60_000,
    }).catch(() => null);

    const ShiftId = ModalSubmission?.fields.getTextInputValue("da-modify-id");
    if (!ModalSubmission) return;
    if (!ShiftId || !IsValidShiftId(ShiftId)) {
      return new ErrorEmbed()
        .useErrTemplate("InvalidShiftId")
        .replyToInteract(ModalSubmission, true, false);
    }

    const ShiftFound = await ShiftModel.findById(ShiftId);
    if (!ShiftFound) {
      return new ErrorEmbed()
        .useErrTemplate("NoShiftFoundWithId", ShiftId)
        .replyToInteract(ModalSubmission, true, false);
    }

    CompCollector.stop();
    return PromptShiftModification(ModalSubmission, ShiftFound);
  });

  CompCollector.on("end", async (CollectedInteracts, EndReason) => {
    if (EndReason.match(/^\w+Delete/)) return;
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    const LastInteract = CollectedInteracts.last();
    if (LastInteract) {
      await LastInteract.editReply({ components: [ButtonsActionRow] }).catch(() => null);
    } else {
      await Interaction.editReply({ components: [ButtonsActionRow] }).catch(() => null);
    }
  });
}

/**
 * Handles the creation of an administrative shift for a target user.
 * @param BInteract - The button interaction that triggered this handler.
 * @param TargetUser - The user to create a shift for.
 * @param ShiftType - Optional shift type to pre-fill in the modal.
 */
async function HandleShiftCreation(
  BInteract: ButtonInteraction<"cached">,
  TargetUser: User,
  ShiftType: Nullable<string>
) {
  const ShiftCreationModal = GetShiftCreationModal(BInteract, ShiftType);
  await BInteract.showModal(ShiftCreationModal);

  const ModalSubmission = await BInteract.awaitModalSubmit({
    filter: (MS) =>
      MS.user.id === BInteract.user.id && MS.customId === ShiftCreationModal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!ModalSubmission) return;
  const InputDuration = ModalSubmission.fields.getTextInputValue("shift-duration");
  const InputShiftType = ModalSubmission.fields.getTextInputValue("shift-type");
  const ParsedDuration = ParseDuration(InputDuration, "millisecond");
  const RoundedDuration = Math.round(ParsedDuration ?? 0);

  if (!ParsedDuration) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDurationExp")
      .replyToInteract(ModalSubmission, true);
  }

  if ((await HandleShiftTypeValidation(ModalSubmission, InputShiftType, true)) === false) {
    return;
  }

  if (RoundedDuration < milliseconds({ seconds: 30 })) {
    return new ErrorEmbed()
      .useErrTemplate("ShortTypedDuration")
      .replyToInteract(ModalSubmission, true);
  }

  if (RoundedDuration > milliseconds({ months: 1 })) {
    return new ErrorEmbed()
      .useErrTemplate("ShiftCreationDurationTooLong")
      .replyToInteract(ModalSubmission, true);
  }

  await ModalSubmission.deferReply({ ephemeral: true });
  const CreatedShift = await ShiftModel.create({
    user: TargetUser.id,
    type: InputShiftType,
    flag: ShiftFlags.Administrative,
    guild: ModalSubmission.guildId,
    start_timestamp: ModalSubmission.createdTimestamp,
    end_timestamp: ModalSubmission.createdTimestamp,
  });

  await ShiftActionLogger.LogShiftTimeAddSub(ModalSubmission, CreatedShift, RoundedDuration, "Add");
  return new SuccessEmbed()
    .setTitle("Shift Created")
    .setDescription(
      Dedent(`
        Successfully created an administrative shift for <@${TargetUser.id}>:
        - Shift ID: \`${CreatedShift._id}\`
        - Duration: ${HumanizeDuration(RoundedDuration)}
        - Of Type: \`${InputShiftType}\`
      `)
    )
    .replyToInteract(ModalSubmission, true);
}

/**
 * Handles the logic of listing recorded and logged shifts for a specific user.
 * @param BInteract - The received button interaction from the collector.
 * @param TargetUser - Target user to list their recorded and logged shifts.
 * @param ShiftType - The type of shifts to list.
 * @returns
 */
async function HandleShiftListing(
  BInteract: ButtonInteraction<"cached">,
  TargetUser: User,
  ShiftType?: Nullable<string>
) {
  const Pages = await RetrieveShiftRecordsAsEmbeds(TargetUser, BInteract.guildId, ShiftType);
  if (Pages.length) {
    return HandlePagePagination({
      context: "Commands:Miscellaneous:Duty:Admin",
      interact: BInteract,
      ephemeral: true,
      pages: Pages,
    });
  } else {
    return new InfoEmbed()
      .setTitle("No Recorded Shifts")
      .setDescription(
        `There are no recorded shifts for this user${
          ShiftType ? ` under the \`${ShiftType}\` type` : ""
        } to list.`
      )
      .replyToInteract(BInteract, true);
  }
}

/**
 * Handles shift data reset/wipe/erase for a specific user with a specific/all type(s).
 * @param BInteract - The received button interaction from the collector.
 * @param TargetUser - Target user to wipe/delete their shifts.
 * @param ShiftType - The type of shifts to consider.
 * @returns
 */
async function HandleUserShiftsWipe(
  BInteract: ButtonInteraction<"cached">,
  TargetUser: User,
  ShiftType?: Nullable<string>
) {
  const EDSType = ShiftType ? `the ${ShiftType}` : "all";
  const ButtonAR = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`da-wipe-confirm:${BInteract.user.id}:${TargetUser.id}`)
      .setEmoji(Emojis.Warning)
      .setLabel("Confirm and Wipe")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`da-wipe-cancel:${BInteract.user.id}:${TargetUser.id}`)
      .setLabel("Cancel Shift Wipe")
      .setStyle(ButtonStyle.Secondary)
  );

  const PromptEmbed = new WarnEmbed()
    .setTitle("Shift Data Reset")
    .setDescription(
      `Are you certain you want to delete and wipe all active and recorded shifts of ${EDSType} type(s) for <@${TargetUser.id}>?\n\n` +
        "**Note:** This is an ***irrevocable*** action, and erased data cannot be recovered."
    );

  const ConfirmationPrompt = await BInteract.reply({
    embeds: [PromptEmbed],
    components: [ButtonAR],
    withResponse: true,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  try {
    const ConfirmationInteract = await ConfirmationPrompt.awaitMessageComponent({
      filter: (BI) => HandleCollectorFiltering(BInteract, BI),
      componentType: ComponentType.Button,
      time: 5 * 60_000,
    });

    if (!ConfirmationInteract.customId.startsWith("da-wipe-confirm")) {
      return new InfoEmbed()
        .setTitle("Shift Wipe Cancelled")
        .setDescription("Shift wipe was cancelled, and no modifications were made.")
        .replyToInteract(BInteract, true, false, "editReply");
    }

    await ConfirmationInteract.deferUpdate();
    const WipeResult = await WipeUserShifts(TargetUser.id, BInteract.guildId, ShiftType);
    const WipeEmbed = new SuccessEmbed()
      .setTimestamp(ConfirmationInteract.createdAt)
      .setDescription(null)
      .setTitle("Member Shifts Wiped")
      .setFields({
        name: "Wipe Details:",
        value: Dedent(`
          **Member:** <@${TargetUser.id}>
          **Wiped Shifts:** [${WipeResult.deletedCount}](${channelLink(ConfirmationInteract.channelId)})
          **On-Duty Time Erased:** ${HumanizeDuration(WipeResult.totalTime)}
        `),
      });

    if (WipeResult.deletedCount === 0) {
      return BInteract.editReply({
        embeds: [new InfoEmbed().useInfoTemplate("NoShiftsWipedFU")],
        components: [],
      });
    }

    return Promise.allSettled([
      ShiftActionLogger.LogShiftsWipe(ConfirmationInteract, WipeResult, ShiftType, TargetUser),
      BInteract.editReply({ components: [], embeds: [WipeEmbed] }),
    ]);
  } catch (Err: any) {
    if (Err.message.match(/reason: time/)) {
      ButtonAR.components.forEach((Btn) => Btn.setDisabled(true));
      await BInteract.editReply({ components: [ButtonAR] }).catch((Err) => {
        if (Err.code === 50_001) return;
        throw Err;
      });
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion errors */
    } else {
      throw Err;
    }
  }
}

/**
 * Handles the termination of an active shift for a `TargetUser`.
 * @param BInteract - The received button interaction from the collector.
 * @param RespMessage - The original administration prompt message that was sent. Required to alter its information.
 * @param TargetUser - Target user to end their currently active shift.
 * @param ActiveShift - The currently active shift to end.
 * @param CmdShiftType - The type of shift received from the command options. Could be different from `ActiveShift.type`.
 * @returns
 */
async function HandleUserShiftEnd(
  BInteract: ButtonInteraction<"cached">,
  RespMessage: Message<true>,
  TargetUser: User,
  ActiveShift: Shifts.HydratedShiftDocument,
  CmdShiftType?: Nullable<string>
) {
  await BInteract.deferUpdate();
  const EndedShift = await ActiveShift.end(BInteract.createdTimestamp);
  const TotalBreakTime = EndedShift.hasBreaks()
    ? `**Total Break Time:** ${HumanizeDuration(EndedShift.durations.on_break)}`
    : "";

  const UserShiftsData = await GetMainShiftsData({
    user: TargetUser.id,
    guild: BInteract.guildId,
    type: CmdShiftType,
  });

  const FreqShiftTypeLine = CmdShiftType
    ? ""
    : `**Frequent Shift:** \`${UserShiftsData.frequent_shift_type}\`\n`;

  const ShiftsInfo =
    `>>> **Shift Count:** \`${UserShiftsData.shift_count}\`\n` +
    FreqShiftTypeLine +
    `**Total Time:** ${UserShiftsData.total_onduty}\n` +
    `**Average Time:** ${UserShiftsData.avg_onduty}`;

  const RespEmbed = new EmbedBuilder()
    .setColor(Colors.ShiftOff)
    .setTimestamp(EndedShift.end_timestamp)
    .setTitle("Shift Ended")
    .setFooter({ text: `Shift Type: ${EndedShift.type}` })
    .setAuthor({
      name: `Shift Administration for @${TargetUser.username}`,
      iconURL: TargetUser.displayAvatarURL({ size: 128 }),
    })
    .setFields(
      {
        name: "Statistics Summary:",
        value: ShiftsInfo,
      },
      {
        inline: true,
        name: "Previous Shift:",
        value: Dedent(`
          **Total Time:** ${HumanizeDuration(EndedShift.durations.on_duty)}
          ${TotalBreakTime}
        `),
      },
      {
        inline: true,
        name: "Duty Activities:",
        value: Dedent(`
          >>> **Arrests Made:** \`${EndedShift.events.arrests}\`
          **Citations Issued:** \`${EndedShift.events.citations}\`
          **Incidents Reported:** \`${EndedShift.events.incidents}\`
        `),
      }
    );

  return Promise.all([
    ShiftActionLogger.LogShiftEnd(EndedShift, BInteract, BInteract.user, TargetUser),
    HandleRoleAssignment("off-duty", BInteract.client, BInteract.guild, BInteract.user.id),
    RespMessage.edit({
      components: GetShiftAdminButtonsRows(false, BInteract),
      embeds: [RespEmbed],
    }),
  ]);
}

/**
 * Handles the deletion logic for a `TargetUser`'s shift.
 * @param BInteract - The received button interaction from the collector.
 * @param TargetUser - Target user to delete a shift for.
 * @returns
 */
async function HandleUserShiftDelete(BInteract: ButtonInteraction<"cached">, TargetUser: User) {
  const Modal = new ModalBuilder()
    .setTitle("Shift Deletion")
    .setCustomId(`da-delete-shift:${BInteract.user.id}:${TargetUser.id}:${RandomString(4)}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter the desired shift's ID to delete here...")
          .setCustomId("da-shift-id")
          .setLabel("Shift ID")
          .setMaxLength(15)
          .setMinLength(15)
          .setRequired(true)
      )
    );

  await BInteract.showModal(Modal);
  const ModalSubmission = await BInteract.awaitModalSubmit({
    filter: (MS) => MS.user.id === BInteract.user.id && MS.customId === Modal.data.custom_id,
    time: 5 * 60_000,
  }).catch(() => null);

  if (!ModalSubmission) return;
  const ShiftId = ModalSubmission.fields.getTextInputValue("da-shift-id");
  const ShiftFound = await ShiftModel.findById(ShiftId);

  if (!ShiftFound) {
    return new ErrorEmbed()
      .useErrTemplate("NoShiftFoundWithId", ShiftId)
      .replyToInteract(ModalSubmission, true);
  }

  if (!ShiftFound.end_timestamp) {
    HandleRoleAssignment("off-duty", BInteract.client, BInteract.guild, BInteract.user.id).catch(
      () => null
    );
  }

  await ShiftFound.deleteOne();
  return Promise.allSettled([
    ShiftActionLogger.LogShiftDelete(BInteract, ShiftFound),
    new SuccessEmbed()
      .setTitle("Shift Deleted")
      .setDescription(`The shift with the identifier \`${ShiftId}\` was successfully deleted.`)
      .replyToInteract(ModalSubmission),
  ]);
}

// ---------------------------------------------------------------------------------------
// Initial Logic:
// --------------
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const CmdShiftType = Interaction.options.getString("type", false);
  const TargetUser = Interaction.options.getUser("member", true);

  if (TargetUser.bot) {
    return new ErrorEmbed()
      .useErrTemplate("BotMemberSelected")
      .replyToInteract(Interaction, true, false);
  }

  const ActiveShift = await ShiftModel.findOne({
    end_timestamp: null,
    user: TargetUser.id,
    guild: Interaction.guildId,
    type: CmdShiftType || { $exists: true },
  });

  const UserShiftsData = await GetMainShiftsData(
    {
      user: TargetUser.id,
      guild: Interaction.guildId,
      type: CmdShiftType,
    },
    !!ActiveShift
  );

  const FreqShiftTypeLine = CmdShiftType
    ? ""
    : `**Frequent Shift:** \`${UserShiftsData.frequent_shift_type}\`\n`;

  const ShiftsInfo =
    `>>> **Shift Count:** \`${UserShiftsData.shift_count}\`\n` +
    FreqShiftTypeLine +
    `**Total Time:** ${UserShiftsData.total_onduty}\n` +
    `**Average Time:** ${UserShiftsData.avg_onduty}`;

  const RespEmbed = new EmbedBuilder()
    .setTimestamp()
    .setFields({ name: "Statistics Summary:", value: ShiftsInfo })
    .setFooter({ text: `Shift Type: ${CmdShiftType ?? "All shift types"}` })
    .setAuthor({
      name: `Shift Administration for @${TargetUser.username}`,
      iconURL: TargetUser.displayAvatarURL({ size: 128 }),
    })
    .setColor(
      ActiveShift?.hasBreakActive()
        ? Colors.ShiftBreak
        : ActiveShift
          ? Colors.ShiftOn
          : Colors.DarkBlue
    );

  if (ActiveShift) {
    const StatusText = ActiveShift.hasBreakActive()
      ? `${Emojis.Idle} On-Break`
      : `${Emojis.Online} On-Duty`;

    const TotalBreakTime = ActiveShift.hasBreaks()
      ? `**Total Break Time:** ${HumanizeDuration(ActiveShift.durations.on_break)}`
      : null;

    RespEmbed.addFields({
      name: "Active Shift:",
      value: Dedent(`
        >>> **ID:** \`${ActiveShift._id}\`\
        ${CmdShiftType ? "" : `\n**Type:** \`${ActiveShift.type}\``}
        **Status:** ${StatusText}
        **Shift Started:** ${FormatTime(ActiveShift.start_timestamp, "R")}
        **On-Duty Time:** ${HumanizeDuration(ActiveShift.durations.on_duty)}
        ${TotalBreakTime || ""}
      `),
    });
  }

  const ButtonActionRows = GetShiftAdminButtonsRows(ActiveShift, Interaction);
  const RespMessage = await Interaction.reply({
    embeds: [RespEmbed],
    components: ButtonActionRows,
    withResponse: true,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  const ActionCollector = RespMessage.createMessageComponentCollector({
    filter: (BI) => HandleCollectorFiltering(Interaction, BI),
    componentType: ComponentType.Button,
    time: 12.5 * 60_000,
  });

  ActionCollector.on("collect", async (ButtonInteract) => {
    const CustomId = ButtonInteract.customId.split(":")[0];
    try {
      switch (CustomId) {
        case "da-list":
          await HandleShiftListing(ButtonInteract, TargetUser, CmdShiftType);
          break;
        case "da-wipe":
          await HandleUserShiftsWipe(ButtonInteract, TargetUser, CmdShiftType);
          break;
        case "da-delete":
          await HandleUserShiftDelete(ButtonInteract, TargetUser);
          break;
        case "da-create":
          await HandleShiftCreation(ButtonInteract, TargetUser, CmdShiftType);
          break;
        case "da-end":
          if (ActiveShift) {
            await HandleUserShiftEnd(
              ButtonInteract,
              RespMessage,
              TargetUser,
              ActiveShift,
              CmdShiftType
            );
          } else {
            await ButtonInteract.deferUpdate();
          }
          break;
        case "da-modify":
          await HandleShiftModifications(ButtonInteract, TargetUser, CmdShiftType);
          break;
        default:
          break;
      }
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && Err.code === 50_001) {
        return;
      }

      ActionCollector.stop("ErrorOccurred");
      if (Err instanceof AppError && Err.is_showable) {
        return new ErrorEmbed().useErrClass(Err).replyToInteract(ButtonInteract, true);
      } else {
        AppLogger.error({
          message: "An unexpected error occurred while responding to a button interaction;",
          label: FileLabel,
          stack: Err.stack,
        });

        return new ErrorEmbed().useErrTemplate("AppError").replyToInteract(ButtonInteract, true);
      }
    }
  });

  ActionCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.match(/^\w+Delete/) || EndReason === "ErrorOccurred") return;
    try {
      const LastInteract = Collected.last() ?? Interaction;
      ButtonActionRows.forEach((ActionRow) =>
        ActionRow.components.forEach((Comp) => Comp.setDisabled(true))
      );

      await LastInteract.editReply({ message: RespMessage, components: ButtonActionRows });
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && Err.code === 50_001) {
        return;
      }

      AppLogger.error({
        message: "An error occurred while ending the component collector;",
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
    .setName("admin")
    .setDescription("Manage and administer the duty shift of somebody else.")
    .addUserOption((Option) =>
      Option.setName("member")
        .setDescription("The member to manage their duty shift.")
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The type of duty shift to be managed.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
