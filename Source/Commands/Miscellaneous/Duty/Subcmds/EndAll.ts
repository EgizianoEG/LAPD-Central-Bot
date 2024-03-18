// Dependencies:
// -------------

import {
  ButtonStyle,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { IsValidShiftTypeName } from "@Utilities/Other/Validators.js";
import { InfoEmbed, WarnEmbed, SuccessEmbed, ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import ShiftModel from "@Models/Shift.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param ShiftTypeName - The provided shift type name from the user
 * @param Interaction - The user command interaction
 * @returns If the interaction has been handled, returns `true`, otherwise returns `false`
 */
async function HandleSTNameValidation(
  CmdInteraction: SlashCommandInteraction<"cached">,
  ShiftTypeName: string
): Promise<boolean> {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedShiftTypeName")
      .replyToInteract(CmdInteraction, true)
      .then(() => true);
  }
  return false;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const ShiftType = Interaction.options.getString("type");
  if (ShiftType && (await HandleSTNameValidation(Interaction, ShiftType))) return;

  const QueryMatch = {
    guild: Interaction.guildId,
    type: ShiftType ?? { $exists: true },
    end_timestamp: null,
  };

  const ShiftCount = await ShiftModel.countDocuments(QueryMatch).exec();
  console.log(ShiftCount);
  if (ShiftCount === 0) {
    return new InfoEmbed()
      .useInfoTemplate("NoShiftsFoundEndAll")
      .replyToInteract(Interaction, true);
  }

  const PromptEmbed = new WarnEmbed()
    .setTitle("Confirmation Required")
    .setFooter({
      iconURL: "https://i.ibb.co/d7mdTRY/Info-Orange-Outlined-28.png",
      text: "This prompt will automatically cancel after five minutes of inactivity.",
    })
    .setDescription(
      "**Are you sure you want to end %s`%s` active shift%s under %s?**",
      ShiftCount === 1 ? "" : "all ",
      ShiftCount,
      ShiftCount > 1 ? "s" : "",
      ShiftType ? `the \`${ShiftType}\` shift type` : "all shift types"
    );

  const PromptComponents = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-end:${Interaction.user.id}`)
        .setLabel("Confirm and End All")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`cancel-end:${Interaction.user.id}`)
        .setLabel("Cancel End All")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];

  const PromptMessage = await Interaction.reply({
    embeds: [PromptEmbed],
    components: PromptComponents,
    fetchReply: true,
  });

  await PromptMessage.awaitMessageComponent({
    filter: (ButtonInteract) => HandleCollectorFiltering(Interaction, ButtonInteract),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  })
    .then(async (ButtonInteract) => {
      await ButtonInteract.deferUpdate();
      if (ButtonInteract.customId.includes("confirm-end")) {
        const Response = await ShiftModel.updateMany(QueryMatch, [
          {
            $set: {
              end_timestamp: ButtonInteract.createdAt,
              "durations.on_break": {
                $sum: {
                  $map: {
                    input: "$events.breaks",
                    as: "break",
                    in: {
                      $subtract: [
                        { $ifNull: ["$$break.end", ButtonInteract.createdTimestamp] },
                        "$$break.start",
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            $set: {
              "durations.on_duty": {
                $add: [
                  { $ifNull: ["$durations.on_duty_mod", 0] },
                  {
                    $subtract: [
                      {
                        $dateDiff: {
                          startDate: "$start_timestamp",
                          endDate: "$end_timestamp",
                          unit: "millisecond",
                        },
                      },
                      "$durations.on_break",
                    ],
                  },
                ],
              },
            },
          },
        ]).exec();

        if (Response.modifiedCount === 0) {
          return ButtonInteract.editReply({
            components: [],
            embeds: [
              new InfoEmbed()
                .setThumbnail(null)
                .setTitle("No Shifts Ended")
                .setDescription(
                  "There were no active shifts to end, and therefore no change was made."
                ),
            ],
          });
        }

        return Promise.all([
          ShiftActionLogger.LogShiftsEndAll(ButtonInteract, Response, ShiftType),
          ButtonInteract.editReply({
            components: [],
            embeds: [
              new SuccessEmbed()
                .setThumbnail(null)
                .setDescription(
                  ShiftType
                    ? `Successfully ended%s active \`${Response.modifiedCount}\` shift%s under the \`${ShiftType}\` type.`
                    : `Successfully ended%s \`${Response.modifiedCount}\` active shift%s.`,
                  Response.modifiedCount === 1 ? "" : " all",
                  Response.modifiedCount === 1 ? "" : "s"
                ),
            ],
          }),
        ]);
      } else {
        return ButtonInteract.editReply({
          components: [],
          embeds: [
            new InfoEmbed()
              .setThumbnail(null)
              .setTitle("End All Cancelled")
              .setDescription("Prompt to end all currently active shifts has been cancelled."),
          ],
        });
      }
    })
    .catch((Err) => HandleActionCollectorExceptions(Err, PromptMessage));
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("end-all")
    .setDescription("Forcefully end all currently active shifts.")
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The type of shifts to end. Defaults to all duty shift types.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
