/* eslint-disable no-unused-vars */
// -------------
// Dependencies:
// ------------------------------------------------------------------------------------

const {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  RoleSelectMenuInteraction,
  RoleSelectMenuBuilder,
  ButtonInteraction,
  ActionRowBuilder,
  escapeMarkdown,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Client,
  Colors,
} = require("discord.js");

const {
  InfoEmbed,
  SuccessEmbed,
  UnauthorizedEmbed,
} = require("../../../../../Utilities/General/ExtraEmbeds");

const { IsValidShiftTypeName } = require("../../../../../Utilities/Strings/Validator");
const { SendErrorReply } = require("../../../../../Utilities/General/SendReply");
const CreateShiftType = require("../../../../../Utilities/Database/CreateShiftType");
const Chalk = require("chalk");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------

/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param {ChatInputCommandInteraction} Interaction
 * @param {String} ShiftTypeName
 * @returns {Promise<InteractionResponse|void>}
 */
function HandleNameValidation(Interaction, ShiftTypeName) {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return SendErrorReply({
      Ephemeral: true,
      Interact: Interaction,
      Title: "Malformed Shift Type Name",
      Message:
        "The name of a shift type may only consist of letters, numerals, spaces, underscores, dashes, and periods.",
    });
  } else if (ShiftTypeName === "Default") {
    return SendErrorReply({
      Ephemeral: true,
      Interact: Interaction,
      Title: "Preserved Shift Type Name",
      Message:
        "The name of the `Default` shift type is preserved and cannot be overridden, deleted, or created.",
    });
  }
}

/**
 * Handles the command execution process
 * @param {Client} _
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(_, Interaction) {
  const ShiftTypeName = Interaction.options.getString("name", true);
  let STPermittedRoles = [];

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
        "*This prompt will automatically cancel after five minutes.*"
    );

  const PromptComponents = [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("permissible-roles")
        .setPlaceholder("Specify which roles may utilize this shift type")
        .setMinValues(0)
        .setMaxValues(15)
    ),
    new ActionRowBuilder().addComponents(
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

  // Disables the prompt and prevents any further interaction with its components
  const DisablePrompt = () => {
    PromptComponents[1].components.forEach((Button) => Button.setDisabled(true));
    PromptComponents[0].components[0].setDisabled(true);
    return PromptReply.edit({
      components: PromptComponents,
    });
  };

  /**
   * @param {RoleSelectMenuInteraction|ButtonInteraction} ReceivedInteract
   * @returns {Boolean}
   */
  const CollectorFilter = (ReceivedInteract) => {
    if (ReceivedInteract.isButton() || ReceivedInteract.isRoleSelectMenu()) {
      if (Interaction.user.id !== ReceivedInteract.user.id) {
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
  };

  const PromptReply = await Interaction.reply({
    embeds: [PromptEmbed],
    components: PromptComponents,
  });

  const CompCollector = PromptReply.createMessageComponentCollector({
    filter: CollectorFilter,
    time: 5 * 60_000,
  });

  CompCollector.on("collect", async (CollectInteraction) => {
    if (CollectInteraction.isButton()) {
      if (CollectInteraction.customId === "confirm-creation") {
        CompCollector.stop("confirmation");
      } else {
        CompCollector.stop("cancellation");
      }
    } else if (CollectInteraction.isRoleSelectMenu()) {
      CollectInteraction.deferUpdate().then(() => {
        STPermittedRoles = CollectInteraction.values;
      });
    }
  });

  CompCollector.once("end", async (CollectedInt, EndReason) => {
    const LastInteraction = CollectedInt.last();

    try {
      await DisablePrompt();
      if (EndReason === "confirmation") {
        const Res = await CreateShiftType({
          guild_id: Interaction.guildId,
          name: ShiftTypeName,
          permissible_roles: STPermittedRoles,
        });

        if (!(Res instanceof Error)) {
          return LastInteraction.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                "Successfuly created a new Shift type with the name `%s`.",
                ShiftTypeName
              ),
            ],
          });
        } else {
          return SendErrorReply({
            Title: Res.title,
            Message: Res.message,
            Interact: LastInteraction,
          });
        }
      } else if (EndReason === "cancellation") {
        await LastInteraction.reply({
          embeds: [
            new InfoEmbed()
              .setTitle("Process Cancellation")
              .setDescription("Shift type creation has been cancelled due to user request."),
          ],
        });
      } else if (EndReason === "time") {
        await PromptReply.followUp({
          embeds: [
            new InfoEmbed()
              .setTitle("Process Timed Out")
              .setDescription(
                "Shift type creation has been cancelled due to exceeding the period of five minutes."
              ),
          ],
        });
      }
    } catch (Err) {
      SendErrorReply({ Interact: LastInteraction, Template: "AppError" });
      console.log(
        "%s:%s - An error occurred;\n",
        Chalk.yellow("InteractionCreate"),
        Chalk.red("CommandHandler"),
        Err
      );
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
