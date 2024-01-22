/* eslint-disable sonarjs/no-duplicate-string */
import {
  SlashCommandSubcommandBuilder,
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
  Message,
  Colors,
  User,
} from "discord.js";

import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { ErrorMessages } from "@Resources/AppMessages.js";
import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import { Embeds, Emojis } from "@Config/Shared.js";
import { ActiveShiftsCache } from "@Utilities/Other/Cache.js";
import { SuccessEmbed, InfoEmbed, WarnEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import HandleEmbedPagination from "@Utilities/Other/HandleEmbedPagination.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import ShiftModel from "@Models/Shift.js";
import DHumanize from "humanize-duration";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import Chunks from "@Utilities/Other/SliceIntoChunks.js";
import Dedent from "dedent";
import Util from "node:util";

const FileLabel = "Commands:Miscellaneous:Duty:Admin";
const HumanizeDuration = DHumanize.humanizer({
  conjunction: " and ",
  largest: 3,
  round: true,
});

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * For shift modifications.
 * Not planned to be used yet & needs to be completed.
 * @param TargetUser
 * @param Interaction
 * @param ShiftType
 * @param ActiveShift
 */
// async function HandleShiftModifications(
//   TargetUser: User,
//   Interaction: ButtonInteraction<"cached">,
//   ShiftType: string,
//   ActiveShift: ExtraTypings.HydratedShiftDocument | null
// ) {
//   const RespEmbed = new EmbedBuilder()
//     .setColor(Colors.DarkBlue)
//     .setTitle("Shift Modifier")
//     .setDescription("Please select a shift to modify its durations.")
//     .setAuthor({
//       name: TargetUser.username,
//       iconURL: TargetUser.avatarURL() || undefined,
//     });

//   const ButtonsActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
//     new ButtonBuilder()
//       .setCustomId("da-modify-curr")
//       .setLabel("Current Shift")
//       .setDisabled(!ActiveShift)
//       .setStyle(ButtonStyle.Secondary),
//     new ButtonBuilder()
//       .setCustomId("da-modify-id")
//       .setLabel("Shift ID")
//       .setDisabled(false)
//       .setStyle(ButtonStyle.Secondary)
//   );

//   const Message = await Interaction[Interaction.replied ? "followUp" : "reply"]({
//     components: [ButtonsActionRow],
//     embeds: [RespEmbed],
//     fetchReply: true,
//   });

//   const CompCollector = Message.createMessageComponentCollector({
//     filter: (BInteract) => HandleCollectorFiltering(Interaction, BInteract),
//     componentType: ComponentType.Button,
//     time: 5 * 60_000,
//   });

//   CompCollector.on("collect", async (ButtonInteract) => {
//     await ButtonInteract.deferUpdate();
//     if (ButtonInteract.customId === "da-modify-curr") {
//       const CurrentShift = await ShiftModel.findOne({
//         user: TargetUser.id,
//         guild: Interaction.guildId,
//         type: ShiftType,
//         end_timestamp: { $eq: null },
//       });

//       if (!CurrentShift) {
//         return SendErrorReply({
//           Interaction: ButtonInteract,
//           Title: "No Active Shift",
//           Message: "There is no active shift for this user to modify.",
//         });
//       }
//     } else {
//       const ShiftIdModal = new ModalBuilder()
//         .setCustomId("da-modify-id-getter")
//         .setTitle("Modify Shift")
//         .addComponents(
//           new ActionRowBuilder<TextInputBuilder>().addComponents(
//             new TextInputBuilder()
//               .setLabel("Shift ID")
//               .setPlaceholder("Fill in the 15-character numeric shift id.")
//               .setCustomId("da-modify-id")
//               .setRequired(true)
//               .setMinLength(20)
//               .setMaxLength(20)
//               .setStyle(TextInputStyle.Short)
//           )
//         );

//       await ButtonInteract.showModal(ShiftIdModal);
//       const ModalSubmission = await ButtonInteract.awaitModalSubmit({
//         time: 5 * 60_000,
//         filter: (MS) => MS.user.id === ButtonInteract.user.id,
//       }).catch(() => null);

//       if (ModalSubmission) {
//         const ShiftId = ModalSubmission.fields.getTextInputValue("da-modify-id");
//         const ShiftFound = await ShiftModel.findById(ShiftId);

//         if (!ShiftFound) {
//           return SendErrorReply({
//             Interaction: ModalSubmission,
//             Title: "Shift Not Found",
//             Message: "A shift with the ID you provided was not found.",
//           });
//         }
//       }
//     }
//   });

//   CompCollector.on("end", async (Collected, EndReason) => {
//     CompCollector.removeAllListeners();
//     if (EndReason.match(/\w+Delete/)) return;
//     try {
//       if (EndReason === "time") {
//         ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
//         await Message.edit({ components: [ButtonsActionRow] });
//       }
//     } catch (Err: any) {
//       AppLogger.error({
//         message: "An error occurred while creating a new shift;",
//         label: "Commands:Miscellaneous:DutyManage",
//         user_id: Interaction.user.id,
//         guild_id: Interaction.guildId,
//         stack: Err.stack,
//       });

//       SendErrorReply({
//         Interaction: Collected.last() ?? Interaction,
//         Template: "AppError",
//       });
//     }
//   });
// }

/**
 * Wipes a user's shifts
 * @param UserId - The snowflake Id of the user to wipe shifts for.
 * @param GuildId - The snowflake Id of the guild the user in.
 * @param [ShiftType="Default"] - The type of shift to wipe.
 * @returns
 */
async function WipeUserShifts(TargetUserId: string, GuildId: string, ShiftType?: string | null) {
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

  return ShiftModel.deleteMany(QueryFilter).then((DResult: any) => {
    DResult.allTime = TData[0]?.totalTime ?? 0;
    return DResult as Mongoose.mongo.DeleteResult & { allTime: number };
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
async function GetPaginatedShifts(TargetUser: User, GuildId: string, ShiftType?: string | null) {
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
        **Shift ID:** \`${Data._id}\`
        **Shift Duration:** ${HumanizeDuration(Data.duration)}
        **Shift Started:** ${Started}
        **Shift Ended:** ${Ended}
      `);
    }).join("\n\n");

    return new InfoEmbed()
      .setDescription(EmbedDescription)
      .setThumbnail(null)
      .setTimestamp()
      .setTitle("Recorded Shifts")
      .setFooter({ text: `Showing Records for Type: ${ShiftType ?? "All shift types"}` })
      .setAuthor({
        name: TargetUser.username,
        iconURL: TargetUser.avatarURL() || undefined,
      });
  });
}

/**
 * Necessary administration buttons.
 * Currently, users can't start shifts or do breaks on other users' behalf.
 * @param ShiftActive
 * @param Interaction
 * @returns
 */
function GetButtonActionRows(
  ShiftActive: ExtraTypings.HydratedShiftDocument | boolean | null,
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
      .setDisabled(true)
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
  ShiftType?: string | null
) {
  const Pages = await GetPaginatedShifts(TargetUser, BInteract.guildId, ShiftType);
  if (Pages.length) {
    return HandleEmbedPagination(Pages, BInteract, "Commands:Miscellaneous:Duty:Admin");
  } else {
    return new InfoEmbed()
      .setTitle("No Recorded Shifts")
      .setDescription(
        `There are no recorded shifts for this user${
          ShiftType ? ` under the ${ShiftType} type` : ""
        }.`
      )
      .replyToInteract(BInteract);
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
  ShiftType?: string | null
) {
  const EDSType = ShiftType ? `the ${ShiftType}` : "all";
  const ButtonAR = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`da-wipe-confirm:${BInteract.user.id}:${BInteract.guildId}:${TargetUser.id}`)
      .setEmoji(Emojis.Warning)
      .setLabel("Confirm and Wipe")
      .setStyle(ButtonStyle.Danger)
  );

  const PromptEmbed = new WarnEmbed()
    .setTitle("Shift Data Reset")
    .setDescription(
      `Are you certain you want to delete/wipe all recorded shifts of ${EDSType} type(s) for <@${TargetUser.id}>?\n\n` +
        "**Note:** This is an ***irrevocable*** action, and erased data cannot be recovered."
    );

  const ConfirmationPrompt = await BInteract.reply({
    components: [ButtonAR],
    embeds: [PromptEmbed],
  });

  const Confirmation = await ConfirmationPrompt.awaitMessageComponent({
    filter: (BI) => HandleCollectorFiltering(BInteract, BI),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  }).catch(async (Err: any) => {
    if (Err.message.match(/reason: time/)) {
      ButtonAR.components[0].setDisabled(true);
      await ConfirmationPrompt.edit({ components: [ButtonAR] }).catch((Err) => {
        if (Err.code === 50_001) return;
        throw Err;
      });
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion errors */
    } else {
      throw Err;
    }
  });

  // Disregard if the user did not confirm or the collector timed out.
  if (!Confirmation?.customId.startsWith("da-wipe-confirm")) {
    return;
  }

  await Confirmation.deferUpdate();
  const WipeResult = await WipeUserShifts(TargetUser.id, BInteract.guildId, ShiftType);
  const WipeEmbed = new SuccessEmbed()
    .setTimestamp()
    .setDescription(null)
    .setTitle("User Shifts Wiped")
    .setFields({
      name: "Wipe Details:",
      value: Dedent(`
          **User:** <@${TargetUser.id}>
          **Total Wiped Shifts:** \`${WipeResult.deletedCount}\`
          **Total On-Duty Time Erased:** ${HumanizeDuration(WipeResult.allTime)}
        `),
    });

  return ConfirmationPrompt.edit({ components: [], embeds: [WipeEmbed] });
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
  ActiveShift: ExtraTypings.HydratedShiftDocument,
  CmdShiftType?: string | null
) {
  await BInteract.deferUpdate();
  const EndedShift = await ActiveShift.end(BInteract.createdTimestamp);
  const TotalBreakTime =
    EndedShift.durations.on_break > 500
      ? `**Total Break Time:** ${HumanizeDuration(EndedShift.durations.on_break)}`
      : null;

  ActiveShiftsCache.del(EndedShift._id);
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
            **Total Shift Time:** ${HumanizeDuration(EndedShift.durations.total)}
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
    .setCustomId(`da-delete-shift:${BInteract.user.id}:${BInteract.guildId}:${TargetUser.id}`)
    .setTitle("Shift Deletion")
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter the desired shift's ID here to delete...")
          .setCustomId("da-shift-id")
          .setLabel("Shift ID")
          .setMaxLength(15)
          .setMinLength(15)
          .setRequired(true)
      )
    );

  await BInteract.showModal(Modal);
  const ModalSubmission = await BInteract.awaitModalSubmit({
    filter: (MS) => HandleCollectorFiltering(BInteract, MS),
    time: 5 * 60_000,
  }).catch(() => null);

  if (!ModalSubmission) return;
  const ShiftId = ModalSubmission.fields.getTextInputValue("da-shift-id");
  const ShiftFound = await ShiftModel.findById(ShiftId);

  if (!ShiftFound) {
    return SendErrorReply({
      Interaction: ModalSubmission,
      Title: ErrorMessages.NoShiftFoundWithId.Title,
      Message: Util.format(ErrorMessages.NoShiftFoundWithId.Description, ShiftId),
    });
  }

  await ShiftFound.deleteOne();
  ActiveShiftsCache.del(ShiftId);
  await new SuccessEmbed()
    .setTitle("Shift Deleted")
    .setDescription(`Shift with the identifier \`${ShiftId}\` was successfully deleted.`)
    .replyToInteract(ModalSubmission);
}

/**
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const CmdShiftType = Interaction.options.getString("type", false);
  const TargetUser = Interaction.options.getUser("member", true);
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
    .setFields({ name: "All Time Info:", value: ShiftsInfo })
    .setFooter({ text: `Shift Type: ${CmdShiftType ?? "All shift types"}` })
    .setAuthor({
      name: `Shift Administration for @${TargetUser.username}`,
      iconURL: TargetUser.displayAvatarURL({ size: 128 }),
    })
    .setColor(
      ActiveShift?.isBreakActive()
        ? Embeds.Colors.ShiftBreak
        : ActiveShift
          ? Embeds.Colors.ShiftStart
          : Colors.DarkBlue
    );

  if (ActiveShift) {
    const StatusText = ActiveShift.isBreakActive()
      ? `${Emojis.Idle} On-Break`
      : `${Emojis.Online} On-Duty`;

    const TotalBreakTime =
      ActiveShift.durations.on_break > 500
        ? `**Total Break Time:** ${HumanizeDuration(ActiveShift.durations.on_break)}`
        : null;

    RespEmbed.addFields({
      name: "Current Shift:",
      value: Dedent(`
        **ID:** \`${ActiveShift._id}\`
        **Status:** ${StatusText}
        **Shift Started:** ${FormatTime(ActiveShift.start_timestamp, "R")}
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
        return SendErrorReply({
          Interaction: ButtonInteract,
          Message: Err.message,
          Title: Err.title,
        });
      }

      SendErrorReply({
        Interaction: ButtonInteract,
        Template: "AppError",
        Ephemeral: true,
      });
    }
  });

  ActionCollector.on("end", async (Collected, EndReason) => {
    ActionCollector.removeAllListeners();
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
        .setAutocomplete(true)
        .setRequired(false)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
