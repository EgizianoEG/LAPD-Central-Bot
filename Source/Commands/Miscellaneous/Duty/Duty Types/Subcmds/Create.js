/* eslint-disable no-extra-parens */
// @ts-nocheck
// TODO: Authorize uer command execution before continuing.
// -------------
// Dependencies:
// ------------------------------------------------------------------------------------

const {
  SlashCommandSubcommandBuilder,
  RoleSelectMenuBuilder,
  ActionRowBuilder,
  escapeMarkdown,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Colors,
} = require("discord.js");

const {
  InfoEmbed,
  SuccessEmbed,
  UnauthorizedEmbed,
} = require("../../../../../Utilities/Classes/ExtraEmbeds");

const { IsValidShiftTypeName } = require("../../../../../Utilities/Strings/Validator");
const { SendErrorReply } = require("../../../../../Utilities/Other/SendReply");
const CreateShiftType = require("../../../../../Utilities/Database/CreateShiftType");
const GetShiftTypes = require("../../../../../Utilities/Database/GetShiftTypes");
const Chalk = require("chalk");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param {SlashCommandInteraction} Interaction - The user command interaction
 * @param {String} ShiftTypeName - The provided name from the user
 * @returns {Promise<(import("discord.js").Message<boolean>) | (import("discord.js").InteractionResponse<boolean>) | undefined>} The interaction reply (an error reply) if validation failed; otherwise `undefined`
 */
async function HandleNameValidation(Interaction, ShiftTypeName) {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return SendErrorReply({
      Ephemeral: true,
      Interact: Interaction,
      Title: "Malformed Shift Type Name",
      Message:
        "The name of a shift type may only consist of letters, numerals, spaces, underscores, dashes, and periods.",
    });
  } else if (ShiftTypeName.match(/Default/i)) {
    return SendErrorReply({
      Ephemeral: true,
      Interact: Interaction,
      Title: "Preserved Shift Type Name",
      Message:
        "The name of the `Default` shift type is preserved and cannot be overridden, deleted, or created.",
    });
  } else {
    const Exists = await GetShiftTypes(Interaction.guildId).then((ShiftTypes) => {
      for (const ShiftType of ShiftTypes) {
        if (ShiftType.name === ShiftTypeName) return true;
      }
      return false;
    });
    if (Exists)
      return SendErrorReply({
        Ephemeral: true,
        Interact: Interaction,
        Title: "Shift Type Already Exists",
        Message: `There is already a shift type named \`${ShiftTypeName}\`. Please make sure you're creating a distinct shift type.`,
      });
  }
}

/**
 * A helper function that filters the component collector interactions to ensure authorization.
 * @param {SlashCommandInteraction} OriginalInteract - The user command interaction
 * @param {import("discord.js").MessageComponentInteraction} ReceivedInteract - The received interaction from the collector
 * @returns {Boolean} A boolean indicating if the interaction is authorized
 */
function HandleCollectorFiltering(OriginalInteract, ReceivedInteract) {
  if (ReceivedInteract.isButton() || ReceivedInteract.isRoleSelectMenu()) {
    if (OriginalInteract.user.id !== ReceivedInteract.user.id) {
      ReceivedInteract.reply({
        ephemeral: true,
        embeds: [
          new UnauthorizedEmbed().setDescription(
            "You are not permitted to interact with a prompt that somebody else has initiated."
          ),
        ],
      });
      return false;
    } else {
      return true;
    }
  }
  return false;
}

/**
 * Formats the given array of role ids for displaying
 * @param {Array<String>} RoleIds
 * @returns {String}
 */
function FormatPermissibleRoles(RoleIds) {
  if (RoleIds.length) {
    return RoleIds.map((Id, Index) => {
      let SubStr = "";

      if (Index === RoleIds.length - 2) SubStr = ", and ";
      else if (Index + 1 !== RoleIds.length) SubStr = ", ";

      return `<@&${Id}>` + SubStr;
    }).join("");
  } else {
    return "*Usable by All Staff Tagged Members*";
  }
}

/**
 * Handles the command execution process for creating a new duty shift type.
 * @param {DiscordClient} _ - The Discord.js client instance (not used in this function)
 * @param {SlashCommandInteraction} Interaction - The user command interaction
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
async function Callback(_, Interaction) {
  const ShiftTypeName = Interaction.options.getString("name", true);
  let ShiftTypePermittedRoles = [];

  await HandleNameValidation(Interaction, ShiftTypeName);
  if (Interaction.replied) return;

  const PromptEmbed = new EmbedBuilder()
    .setColor(Colors.DarkBlue)
    .setTitle("Shift Type Creation")
    .setDescription(
      `**Name:** \`${escapeMarkdown(ShiftTypeName)}\`\n` +
        "**Permissible Roles:**\n" +
        "- To limit who may use this shift type, choose the appropriate roles from the drop-down menu below.\n" +
        "- To make this shift type available and usable for all members, keep the drop-down menu empty.\n" +
        "- Press the `Confirm and Create` button when finished to proceed.\n" +
        "*This prompt will automatically cancel after five minutes of inactivity.*"
    );

  const PromptComponents = [
    /** @type {ActionRowBuilder<RoleSelectMenuBuilder>} */
    (new ActionRowBuilder()).addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("permissible-roles")
        .setPlaceholder("Specify which roles may utilize this shift type")
        .setMinValues(0)
        .setMaxValues(15)
    ),
    /** @type {ActionRowBuilder<ButtonBuilder>} */
    (new ActionRowBuilder()).addComponents(
      new ButtonBuilder()
        .setCustomId("confirm-creation")
        .setLabel("Confirm and Create")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("cancel-creation")
        .setLabel("Cancel Creation")
        .setStyle(ButtonStyle.Secondary)
    ),
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
      if (CollectInteraction.customId === "confirm-creation") {
        CompCollector.stop("confirmation");
      } else {
        CompCollector.stop("cancellation");
      }
    } else if (CollectInteraction.isRoleSelectMenu()) {
      CollectInteraction.deferUpdate().then(() => {
        ShiftTypePermittedRoles = CollectInteraction.values;
      });
    }
  });

  CompCollector.once("end", async (CollectedInt, EndReason) => {
    const LastInteraction = CollectedInt.last();
    CompCollector.removeAllListeners();
    if (EndReason.match(/\w+Delete/)) return;

    try {
      await DisablePrompt();
      if (EndReason === "confirmation") {
        const Response = await CreateShiftType({
          guild_id: Interaction.guildId,
          name: ShiftTypeName,
          permissible_roles: ShiftTypePermittedRoles,
        });

        if (!(Response instanceof Error)) {
          LastInteraction.reply({
            embeds: [
              new SuccessEmbed()
                .setTitle("Shift Type Created")
                .setDescription(
                  `**Shift Type Name:** \`${ShiftTypeName}\`\n`,
                  "**Permissible Roles:**\n",
                  FormatPermissibleRoles(ShiftTypePermittedRoles)
                ),
            ],
          });
        } else {
          SendErrorReply({
            Title: Response.title,
            Message: Response.message,
            Interact: LastInteraction,
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
    } catch (Err) {
      console.log(
        "%s:%s - An error occurred;\n",
        Chalk.yellow("InteractionCreate"),
        Chalk.red("CommandHandler"),
        Err
      );

      SendErrorReply({
        Interact: LastInteraction ?? Interaction,
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
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
