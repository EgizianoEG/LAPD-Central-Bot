// Dependencies:
// -------------

import {
  SlashCommandSubcommandBuilder,
  RoleSelectMenuBuilder,
  InteractionResponse,
  ActionRowBuilder,
  escapeMarkdown,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Message,
  Colors,
} from "discord.js";

import { InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { IsValidShiftTypeName } from "@Utilities/Other/Validator.js";
import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import { ErrorMessages } from "@Resources/AppMessages.js";

import Util from "util";
import Dedent from "dedent";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetShiftTypes from "@Utilities/Database/GetShiftTypes.js";
import CreateShiftType from "@Utilities/Database/CreateShiftType.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
const ListFormatter = new Intl.ListFormat("en");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param Interaction - The user command interaction
 * @param ShiftTypeName - The provided name from the user
 * @returns The interaction reply (an error reply) if validation failed; otherwise `undefined`
 */
async function HandleNameValidation(
  Interaction: SlashCommandInteraction<"cached">,
  ShiftTypeName: string
): Promise<Message<boolean> | InteractionResponse<boolean> | undefined> {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: ErrorMessages.MalformedShiftTypeName.Title,
      Message: ErrorMessages.MalformedShiftTypeName.Description,
    });
  } else if (ShiftTypeName.match(/Default/i)) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: ErrorMessages.PreservedShiftTypeCreation.Title,
      Message: ErrorMessages.PreservedShiftTypeCreation.Description,
    });
  } else {
    const ShiftTypeExists = await GetShiftTypes(Interaction.guildId).then((ShiftTypes) => {
      for (const ShiftType of ShiftTypes) {
        if (ShiftType.name === ShiftTypeName) return true;
      }
      return false;
    });

    if (ShiftTypeExists)
      return SendErrorReply({
        Ephemeral: true,
        Interaction,
        Title: ErrorMessages.ShiftTypeAlreadyExists.Title,
        Message: Util.format(ErrorMessages.ShiftTypeAlreadyExists.Description, ShiftTypeName),
      });
  }
}

/**
 * Handles the command execution process for creating a new duty shift type.
 * @param _ - The Discord.js client instance (not used in this function)
 * @param Interaction - The user command interaction
 * @description
 * This function guides the user through the process of creating a new duty shift type
 * by providing a prompt with instructions and components for role selection and confirmation.
 * It listens for user interactions and responds accordingly to create or cancel the shift type.
 *
 * @execution
 * 1. Validate the provided Shift Type Name using the `HandleNameValidation` function.
 * 2. If an error reply was sent during validation, return and exit the function.
 * 3. Construct a prompt embed containing instructions for creating a new shift type.
 * 4. Build action rows with components for role selection and confirmation buttons.
 * 5. Declare disable prompt components function to prevent further interaction with them later.
 * 6. Send the prompt embed as a reply to the user's interaction.
 * 7. Create a collector to listen for button and role menu interactions.
 * 8. Handle "collect" events by responding to button and role menu interactions.
 * 9. Handle the "end" event to process the results of the interaction.
 *    - Remove all event listeners
 *    - If the end reason is related to deletion of the prompt (e.g. guildDelete, channelDelete),
 *      - Return and halt the execution
 *    - If the end reason is "confirmation":
 *      - Attempt to create the new shift type in the database using `CreateShiftType` helper function.
 *      - Respond with a success embed or an error message.
 *    - If the end reason is "cancellation":
 *      - Respond with a cancellation message indicating user's request.
 *    - If the end reason is "idle":
 *      - Respond with a message indicating shift type creation was canceled due to inactivity.
 *    - If the end reason is "time":
 *      - Respond with a message indicating shift type creation was canceled due to exceeding time limit.
 * 10. Handle any errors that occurred during the process by sending an error reply and logging the error.
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const ShiftTypeName = Interaction.options.getString("name", true);
  const IsDefaultType = !!Interaction.options.getBoolean("default");
  let ShiftTypePermittedRoles: string[] = [];

  await HandleNameValidation(Interaction, ShiftTypeName);
  if (Interaction.replied) return;

  const PromptEmbed = new EmbedBuilder()
    .setColor(Colors.DarkBlue)
    .setTitle("Shift Type Creation")
    .setDescription(
      Dedent(`
        - **Name:** \`${escapeMarkdown(ShiftTypeName)}\`
        - **Is Default:** \`${IsDefaultType ? "True" : "False"}\`
        - **Permissible Roles:**
          - To limit who may use this shift type, choose the appropriate roles from the drop-down menu below.
          - To make this shift type available and usable for all members, keep the drop-down menu empty.
          - Press the \`Confirm and Create\` button when finished to proceed.
  
        *This prompt will automatically cancel after five minutes of inactivity.*
    `)
    );

  const PromptComponents = [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`permissible-roles:${Interaction.user.id}`)
        .setPlaceholder("Specify which roles may utilize this shift type")
        .setMinValues(0)
        .setMaxValues(15)
    ) as ActionRowBuilder<RoleSelectMenuBuilder>,
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-creation:${Interaction.user.id}`)
        .setLabel("Confirm and Create")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cancel-creation:${Interaction.user.id}`)
        .setLabel("Cancel Creation")
        .setStyle(ButtonStyle.Secondary)
    ) as ActionRowBuilder<ButtonBuilder>,
  ];

  const PromptMessage = await Interaction.reply({
    embeds: [PromptEmbed],
    components: PromptComponents,
  });

  const CompCollector = PromptMessage.createMessageComponentCollector({
    filter: (Collected) => HandleCollectorFiltering(Interaction, Collected),
    idle: 5 * 60_000,
    time: 15 * 60_000,
  });

  // Disables the prompt and prevents any further interaction with its components
  const DisablePrompt = () => {
    PromptComponents[1].components.forEach((Button) => Button.setDisabled(true));
    PromptComponents[0].components[0].setDisabled(true);
    return PromptMessage.edit({
      components: PromptComponents,
    });
  };

  CompCollector.on("collect", async (CollectInteraction) => {
    if (CollectInteraction.isButton()) {
      if (CollectInteraction.customId.includes("confirm-creation")) {
        CompCollector.stop("confirmation");
      } else if (CollectInteraction.customId.includes("cancel-creation")) {
        CompCollector.stop("cancellation");
      }
    } else if (CollectInteraction.isRoleSelectMenu()) {
      CollectInteraction.deferUpdate().then(() => {
        ShiftTypePermittedRoles = CollectInteraction.values;
      });
    }
  });

  CompCollector.once("end", async (CollectedInt, EndReason) => {
    const LastInteraction = CollectedInt.last() ?? Interaction;
    CompCollector.removeAllListeners();
    if (EndReason.match(/\w+Delete/)) return;

    try {
      await DisablePrompt();
      if (EndReason === "confirmation") {
        const Response = await CreateShiftType({
          guild_id: Interaction.guildId,
          name: ShiftTypeName,
          is_default: IsDefaultType,
          permissible_roles: ShiftTypePermittedRoles,
        });

        if (Response instanceof Error) {
          SendErrorReply({
            Title: Response.title,
            Message: Response.message,
            Interaction: LastInteraction,
          });
        } else {
          LastInteraction.reply({
            embeds: [
              new SuccessEmbed()
                .setTitle("Shift Type Created")
                .setDescription(
                  `**Name:** \`${Response.name}\`\n`,
                  `**Is Default:** \`${Response.is_default ? "Yes" : "No"}\`\n`,
                  "**Permissible Roles:**\n",
                  ShiftTypePermittedRoles.length
                    ? ListFormatter.format(ShiftTypePermittedRoles.map((Id) => `<@&${Id}>`))
                    : "*Usable by all staff identified members*"
                ),
            ],
          });
        }
      } else if (EndReason === "cancellation") {
        LastInteraction.reply({
          embeds: [
            new InfoEmbed()
              .setTitle("Process Cancellation")
              .setDescription("Shift type creation has been cancelled due to user request."),
          ],
        });
      } else if (EndReason === "idle") {
        Interaction.followUp({
          embeds: [
            new InfoEmbed()
              .setTitle("Process Timed Out")
              .setDescription("Shift type creation has been cancelled due to inactivity."),
          ],
        });
      } else if (EndReason === "time") {
        Interaction.followUp({
          embeds: [
            new InfoEmbed()
              .setTitle("Process Timed Out")
              .setDescription(
                "Shift type creation has been cancelled after exceeding fifteen minutes."
              ),
          ],
        });
      }
    } catch (Err: any) {
      AppLogger.error({
        message: "Could not query '%s' username;",
        label: "Commands:Miscellaneous:DutyTypes:Create",
        stack: Err.stack,
        details: { ...Err },
      });

      SendErrorReply({
        Interaction: LastInteraction,
        Template: "AppError",
      });
    }
  });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("create")
    .setDescription("Create a new duty shift type.")
    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The duty shift type name to create.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(true)
    )
    .addBooleanOption((Option) =>
      Option.setName("default")
        .setRequired(false)
        .setDescription(
          "Whether or not to make this type the default one. (overwrites any existing default type if true)"
        )
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
