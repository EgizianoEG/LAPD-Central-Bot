/* eslint-disable sonarjs/no-duplicate-string */
import {
  SlashCommandSubcommandBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  ModalSubmitInteraction,
  time as FormatTime,
  ButtonInteraction,
  ActionRowBuilder,
  TextInputBuilder,
  DiscordAPIError,
  TextInputStyle,
  ButtonBuilder,
  ComponentType,
  ModalBuilder,
  EmbedBuilder,
  ButtonStyle,
  channelLink,
  Message,
  Colors,
  User,
} from "discord.js";

import { Shifts } from "@Typings/Utilities/Database.js";
import { RandomString } from "@Utilities/Strings/Random.js";
import { Embeds, Emojis } from "@Config/Shared.js";
import { IsValidShiftId } from "@Utilities/Other/Validators.js";
import { SuccessEmbed, InfoEmbed, WarnEmbed, ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import HandleEmbedPagination from "@Utilities/Other/HandleEmbedPagination.js";
import HandleRoleAssignment from "@Utilities/Other/HandleShiftRoleAssignment.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import ParseDuration from "parse-duration";
import ShiftModel from "@Models/Shift.js";
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
// Functions:
// ----------
/**
 * Necessary administration buttons.
 * Currently, none shall be able to start shifts or do breaks on other users' behalf.
 * @param ShiftActive
 * @param Interaction
 * @returns
 */
function GetButtonActionRows(
  ShiftActive: Shifts.HydratedShiftDocument | boolean | null,
  Interaction: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">
) {
  const ActionRowOne = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("da-list")
      .setLabel("List")
      .setDisabled(false)
      .setEmoji(Emojis.HamburgerList)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("da-modify")
      .setLabel("Modify")
      .setDisabled(false)
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
      .setCustomId("da-start")
      .setLabel("Start")
      .setDisabled(true)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("da-break")
      .setLabel("Break")
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("da-end")
      .setLabel("End")
      .setDisabled(!ShiftActive)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("da-delete")
      .setLabel("Delete")
      .setDisabled(false)
      .setEmoji(Emojis.FileDelete)
      .setStyle(ButtonStyle.Danger)
  ) as ActionRowBuilder<ButtonBuilder & { data: { custom_id: string } }>;

  // Set custom Ids for each button for future usage outside of the main cmd callback function.
  ActionRowOne.components.forEach((Comp) =>
    Comp.setCustomId(`${Comp.data.custom_id}:${Interaction.user.id}:${Interaction.guildId}`)
  );

  ActionRowTwo.components.forEach((Comp) =>
    Comp.setCustomId(`${Comp.data.custom_id}:${Interaction.user.id}:${Interaction.guildId}`)
  );

  return [ActionRowOne, ActionRowTwo];
}

function GetTimeModificationModal(
  ActionType: "Add" | "Subtract" | "Set",
  AdminInteract: StringSelectMenuInteraction<"cached">
) {
  return new ModalBuilder()
    .setCustomId(`da-time-mod:${AdminInteract.user.id}:${AdminInteract.guildId}:${RandomString(4)}`)
    .setTitle("Shift Time Modification")
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("da-st-mod-input")
          .setLabel(`Shift Time To ${ActionType}`)
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(25)
          .setPlaceholder(
            TimeModPlaceholders[Math.floor(Math.random() * TimeModPlaceholders.length)]
          )
      )
    );
}

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
    interact: Interact,
    stack: Err.stack,
    details: {
      ...Err,
    },
  });
}

/**
 * @param AdminInteract - The non deferred interaction.
 * @param ShiftDocument - The target shift document.
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
 * @param AdminInteract - The non deferred interaction.
 * @param ShiftDocument - The target shift document.
 */
async function HandleShiftTimeSet(
  AdminInteract: StringSelectMenuInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  const TMModal = GetTimeModificationModal("Set", AdminInteract);
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
  } else if (RoundedDuration <= 30_000) {
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
 * @param AdminInteract - The non deferred interaction.
 * @param ShiftDocument - The target shift document.
 */
async function HandleShiftTimeAddSub(
  ActionType: "Add" | "Subtract",
  AdminInteract: StringSelectMenuInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  const TMModal = GetTimeModificationModal(ActionType, AdminInteract);
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
  } else if (RoundedDuration <= 30_000) {
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

async function PromptShiftModification(
  Interact: ModalSubmitInteraction<"cached"> | ButtonInteraction<"cached">,
  ShiftDocument: Shifts.HydratedShiftDocument
) {
  if (Interact.isModalSubmit() && !Interact.deferred) await Interact.deferUpdate();
  const ActionOptions = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId("da-modify-actions")
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
    time: 5 * 60_000,
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

    // Remove any selected option.
    return Interact.editReply({ components: [ActionOptions] }).catch(() => null);
  });

  CompCollector.on("end", async (CollectedInteracts, EndReason) => {
    if (EndReason.match(/\w+Delete/)) return;

    try {
      const LastInteract = CollectedInteracts.last() ?? Interact;
      ActionOptions.components[0].setDisabled(true);
      await LastInteract.editReply({ components: [ActionOptions] });
    } catch {
      // Ignored.
    }
  });
}

/**
 * Handles modification logic to selected shifts.
 * @param Interaction - The button interaction that triggered the function.
 * @param TargetUser - The user whose shift is being modified.
 */
async function HandleShiftModifications(
  Interaction: ButtonInteraction<"cached">,
  TargetUser: User
) {
  const IsShiftActive = !!(await GetShiftActive({
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
      .setCustomId(`da-modify-${CurrLastBtn.toLowerCase()}`)
      .setLabel(`Select ${CurrLastBtn} Shift`)
      .setDisabled(false)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("da-modify-id")
      .setLabel("Select By Shift ID")
      .setDisabled(false)
      .setStyle(ButtonStyle.Secondary)
  );

  const Message = await Interaction.reply({
    components: [ButtonsActionRow],
    embeds: [RespEmbed],
    ephemeral: true,
    fetchReply: true,
  });

  const CompCollector = Message.createMessageComponentCollector({
    filter: (BInteract) => HandleCollectorFiltering(Interaction, BInteract),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  });

  CompCollector.on("collect", async (ButtonInteract) => {
    if (ButtonInteract.customId === "da-modify-current") {
      await ButtonInteract.deferUpdate();
      const ActiveShift = await GetShiftActive({
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

    if (ButtonInteract.customId === "da-modify-last") {
      await ButtonInteract.deferUpdate();
      const LastShift = await ShiftModel.findOne({
        guild: Interaction.guildId,
        user: TargetUser.id,
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
      .setCustomId(
        `da-modify-id-getter:${ButtonInteract.user.id}:${ButtonInteract.guildId}:${RandomString(4)}`
      )
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

  CompCollector.on("end", async (_, EndReason) => {
    if (EndReason.match(/\w+Delete/)) return;
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    await Message.edit({ components: [ButtonsActionRow] }).catch(() => null);
  });
}

/**
 * Wipes a user's shifts
 * @param UserId - The snowflake Id of the user to wipe shifts for.
 * @param GuildId - The snowflake Id of the guild the user in.
 * @param [ShiftType="Default"] - The type of shift to wipe.
 * @returns
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
 * Returns a paginated and listed shifts of a user, where
 * each embed shouldn't describe/list more than 4 shifts.
 * Aggregation test: https://mongoplayground.net/p/PwnbTQVfPBy
 * @param TargetUser - The targetted user.
 * @param GuildId - The guild id that the user is in.
 * @param [ShiftType] - Shift type targetted.
 * @returns
 */
async function GetPaginatedShifts(TargetUser: User, GuildId: string, ShiftType?: Nullable<string>) {
  const ShiftData: {
    _id: string;
    /** Start epoch in milliseconds */
    started: number;
    /** End epoch in milliseconds or `"Currently Active"` */
    ended: number | string;
    /** On-duty duration in milliseconds */
    duration: number;
    /** On-break duration in milliseconds */
    break_duration: number;
  }[] = await ShiftModel.aggregate([
    {
      $match: {
        user: TargetUser.id,
        guild: GuildId,
        type: ShiftType ?? { $exists: true },
      },
    },
    {
      $project: {
        _id: 1,
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
                    new Date(),
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
                      $ifNull: [
                        {
                          $arrayElemAt: ["$$this", 1],
                        },
                        new Date(),
                      ],
                    },
                    {
                      $arrayElemAt: ["$$this", 0],
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

  // Split results into arrays of 4 shift details each & format them as embeds.
  return Chunks(ShiftData, 4).map((Chunk) => {
    const EmbedDescription = Chunk.map((Data) => {
      const Started = FormatTime(Math.round(Data.started / 1000), "f");
      const Ended =
        typeof Data.ended === "string"
          ? Data.ended
          : FormatTime(Math.round(Data.started / 1000), "T");

      return Dedent(`
        - **Shift ID:** \`${Data._id}\`
          - **Duration:** ${HumanizeDuration(Data.duration)}
          - **Started:** ${Started}
          - **Ended:** ${Ended}
      `);
    }).join("\n\n");

    const FooterAppend = ShiftType ? `type: ${ShiftType}` : "all shift types";
    return new InfoEmbed()
      .setDescription(EmbedDescription)
      .setThumbnail(null)
      .setTimestamp()
      .setTitle("Recorded Shifts")
      .setFooter({
        text: `Showing records for ${FooterAppend}`,
      })
      .setAuthor({
        name: `@${TargetUser.username}`,
        iconURL: TargetUser.displayAvatarURL({ size: 128 }),
      });
  });
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
  const Pages = await GetPaginatedShifts(TargetUser, BInteract.guildId, ShiftType);
  if (Pages.length) {
    return HandleEmbedPagination(Pages, BInteract, "Commands:Miscellaneous:Duty:Admin");
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
      .setCustomId(`da-wipe-confirm:${BInteract.user.id}:${BInteract.guildId}:${TargetUser.id}`)
      .setEmoji(Emojis.Warning)
      .setLabel("Confirm and Wipe")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`da-wipe-cancel:${BInteract.user.id}:${BInteract.guildId}:${TargetUser.id}`)
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
    fetchReply: true,
    components: [ButtonAR],
    embeds: [PromptEmbed],
  });

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
    let WipeEmbed = new SuccessEmbed()
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
      WipeEmbed = new InfoEmbed().useInfoTemplate("NoShiftsWipedFU");
    }

    return Promise.allSettled([
      ShiftActionLogger.LogShiftsWipe(ConfirmationInteract, WipeResult, ShiftType, TargetUser),
      BInteract.editReply({ components: [], embeds: [WipeEmbed] }),
    ]);
  } catch (Err: any) {
    if (Err.message.match(/reason: time/)) {
      ButtonAR.components[0].setDisabled(true);
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
    : null;

  const UserShiftsData = await GetMainShiftsData({
    user: TargetUser.id,
    guild: BInteract.guildId,
    type: CmdShiftType,
  });

  const ShiftsInfo = Dedent(`
    **Shift Count:** \`${UserShiftsData.shift_count}\`
    **Total On-Duty Time:** ${UserShiftsData.total_onduty}
    **Average On-Duty Time:** ${UserShiftsData.avg_onduty}
  `);

  const RespEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.ShiftEnd)
    .setTimestamp(EndedShift.end_timestamp)
    .setTitle("Shift Ended")
    .setFooter({ text: `Shift Type: ${EndedShift.type}` })
    .setAuthor({
      name: `Shift Administration for @${TargetUser.username}`,
      iconURL: TargetUser.displayAvatarURL({ size: 128 }),
    })
    .setFields(
      {
        name: "All Time Info:",
        value: ShiftsInfo,
      },
      {
        name: "Last Shift:",
        value: Dedent(`
          **Status:** ${Emojis.Offline} Ended (Off-Duty)
          **Total Shift Time:** ${HumanizeDuration(EndedShift.durations.on_duty)}
          ${TotalBreakTime || ""}
        `),
      },
      {
        name: "Last Shift Statics:",
        value: Dedent(`
          **Arrests Made:** \`${EndedShift.events.arrests}\`
          **Citations Issued:** \`${EndedShift.events.citations}\`
        `),
      }
    );

  return Promise.all([
    ShiftActionLogger.LogShiftEnd(EndedShift, BInteract, BInteract.user, TargetUser),
    HandleRoleAssignment("off-duty", BInteract.client, BInteract.guild, BInteract.user.id),
    RespMessage.edit({
      components: GetButtonActionRows(false, BInteract),
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
    .setCustomId(
      `da-delete-shift:${BInteract.user.id}:${BInteract.guildId}:${TargetUser.id}:${RandomString(4)}`
    )
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
    type: CmdShiftType ?? { $exists: true },
  });

  const UserShiftsData = await GetMainShiftsData(
    {
      user: TargetUser.id,
      guild: Interaction.guildId,
      type: CmdShiftType,
    },
    !!ActiveShift
  );

  const ShiftsInfo = Dedent(`
    **Shift Count:** \`${UserShiftsData.shift_count}\`
    **Total On-Duty Time:** ${UserShiftsData.total_onduty}
    **Average On-Duty Time:** ${UserShiftsData.avg_onduty}
  `);

  const RespEmbed = new EmbedBuilder()
    .setTimestamp()
    .setFields({ name: "All Time Statistics:", value: ShiftsInfo })
    .setFooter({ text: `Shift Type: ${CmdShiftType ?? "All shift types"}` })
    .setAuthor({
      name: `Shift Administration for @${TargetUser.username}`,
      iconURL: TargetUser.displayAvatarURL({ size: 128 }),
    })
    .setColor(
      ActiveShift?.hasBreakActive()
        ? Embeds.Colors.ShiftBreak
        : ActiveShift
          ? Embeds.Colors.ShiftStart
          : Colors.DarkBlue
    );

  if (ActiveShift) {
    const StatusText = ActiveShift.hasBreakActive()
      ? `${Emojis.Idle} On-Break`
      : `${Emojis.Online} On-Duty`;

    const TotalBreakTime = ActiveShift.hasBreaks()
      ? `**Total Break Time:** ${HumanizeDuration(ActiveShift.durations.on_break)}`
      : null;

    ActiveShift.durations.on_duty = -1;
    RespEmbed.addFields({
      name: "Active Shift:",
      value: Dedent(`
        **ID:** \`${ActiveShift._id}\`\
        ${CmdShiftType ? "" : `\n**Type:** \`${ActiveShift.type}\``}
        **Status:** ${StatusText}
        **Shift Started:** ${FormatTime(ActiveShift.start_timestamp, "R")}
        **On-Duty Time:** ${HumanizeDuration(ActiveShift.durations.on_duty)}
        ${TotalBreakTime || ""}
      `),
    });
  }

  const ButtonActionRows = GetButtonActionRows(ActiveShift, Interaction);
  const RespMessage = await Interaction.reply({
    components: ButtonActionRows,
    embeds: [RespEmbed],
    fetchReply: true,
  });

  const ActionCollector = RespMessage.createMessageComponentCollector({
    filter: (BI) => HandleCollectorFiltering(Interaction, BI),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
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
          await HandleShiftModifications(ButtonInteract, TargetUser);
          break;
        default:
          break;
      }
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && Err.code === 50_001) {
        return;
      }

      AppLogger.error({
        message: "An error occurred while responding to a button interaction;",
        label: FileLabel,
        user_id: Interaction.user.id,
        guild_id: Interaction.guildId,
        stack: Err.stack,
      });

      if (Err instanceof AppError && Err.is_showable) {
        await new ErrorEmbed()
          .setTitle(Err.title)
          .setDescription(Err.message)
          .replyToInteract(ButtonInteract);
      }

      await new ErrorEmbed()
        .useErrTemplate("AppError")
        .replyToInteract(ButtonInteract, true, false);
    }
  });

  ActionCollector.on("end", async (_, EndReason) => {
    if (EndReason.match(/\w+Delete/)) return;
    try {
      if (EndReason === "time") {
        ButtonActionRows.forEach((ActionRow) =>
          ActionRow.components.forEach((Comp) => Comp.setDisabled(true))
        );
        await RespMessage.edit({
          components: ButtonActionRows,
        });
      }
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && Err.code === 50_001) {
        return;
      }

      AppLogger.error({
        message: "An error occurred while ending the component collector;",
        label: FileLabel,
        user_id: Interaction.user.id,
        guild_id: Interaction.guildId,
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
