// Dependencies:
// -------------

import { InfoEmbed, WarnEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { HandleShiftTypeValidation } from "@Utilities/Database/ShiftTypeValidators.js";
import {
  ButtonStyle,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";
import HandleShiftRoleAssignment from "@Utilities/Other/HandleShiftRoleAssignment.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import ShiftModel from "@Models/Shift.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const ShiftType = Interaction.options.getString("type");
  if (ShiftType && (await HandleShiftTypeValidation(Interaction, ShiftType, true))) return;

  const QueryMatch = {
    guild: Interaction.guildId,
    type: ShiftType ?? { $exists: true },
    end_timestamp: null,
  };

  const ShiftCount = await ShiftModel.countDocuments(QueryMatch).exec();
  if (ShiftCount === 0) {
    return new InfoEmbed()
      .useInfoTemplate("NoShiftsFoundEndAll")
      .replyToInteract(Interaction, true);
  }

  const PromptEmbed = new WarnEmbed()
    .setTitle("Confirmation Required")
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

  const PromptSent = await Interaction.reply({
    embeds: [PromptEmbed],
    components: PromptComponents,
  });

  const ButtonInteract = await PromptSent.awaitMessageComponent({
    filter: (ButtonInteract) => HandleCollectorFiltering(Interaction, ButtonInteract),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  }).catch((Err) => HandleActionCollectorExceptions(Err, PromptSent));

  if (!ButtonInteract) return;
  await ButtonInteract.deferUpdate();

  if (ButtonInteract.customId.includes("cancel-end")) {
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

  const ActiveShifts = await GetShiftActive({ Interaction: ButtonInteract, ShiftType });
  if (!ActiveShifts.length) {
    return ButtonInteract.editReply({
      components: [],
      embeds: [
        new InfoEmbed()
          .setThumbnail(null)
          .setTitle("No Shifts Ended")
          .setDescription("There were no active shifts to end, and therefore no change was made."),
      ],
    });
  }

  const ShiftsEndedFU: string[] = [];
  await Promise.all(
    ActiveShifts.map((Shift) =>
      Shift.end(ButtonInteract.createdAt).then((Shift) => ShiftsEndedFU.push(Shift.user))
    )
  );

  const ESLength = ShiftsEndedFU.length;
  if (!ESLength) {
    return ButtonInteract.editReply({
      components: [],
      embeds: [
        new InfoEmbed()
          .setThumbnail(null)
          .setTitle("No Shifts Ended")
          .setDescription("There were no active shifts to end, and therefore no change was made."),
      ],
    });
  }

  return Promise.allSettled([
    ShiftActionLogger.LogShiftsEndAll(ButtonInteract, ESLength, ShiftType).catch(() => null),
    HandleShiftRoleAssignment("off-duty", Interaction.client, Interaction.guild, ShiftsEndedFU),
    ButtonInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setThumbnail(null)
          .setDescription(
            ShiftType
              ? `Successfully ended%s active \`${ESLength}\` shift%s under the \`${ShiftType}\` type.`
              : `Successfully ended%s \`${ESLength}\` active shift%s.`,
            ESLength === 1 ? "" : " all",
            ESLength === 1 ? "" : "s"
          ),
      ],
    }),
  ]);
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
