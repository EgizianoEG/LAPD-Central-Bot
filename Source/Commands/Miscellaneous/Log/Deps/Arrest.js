// @ts-nocheck
/* eslint-disable no-unused-vars */
// -------------
// Dependencies:
// ---------------------------------------------------------------------------------------

const {
  ButtonStyle,
  ButtonBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
  ModalBuilder,
  EmbedBuilder,
  Colors,
  // StringSelectMenuBuilder,
  // StringSelectMenuOptionBuilder,
} = require("discord.js");

const { ErrorEmbed } = require("../../../../Utilities/Classes/ExtraEmbeds.js");
const { getPlayerThumbnail, getIdFromUsername, getPlayerInfo } = require("noblox.js");
const {
  FormatCharges,
  FormatHeight,
  FormatAge,
} = require("../../../../Utilities/Strings/Formatter.js");
const {
  Embeds: { Thumbs },
} = require("../../../../Config/Shared.json");
const { RandomString } = require("../../../../Utilities/Strings/Random.js");
const Chalk = require("chalk");

const ArrestAges = [
  { name: "Kid (1-12)", value: 1 },
  { name: "Teen (13-19)", value: 2 },
  { name: "Young Adult (20-29)", value: 3 },
  { name: "Mid Adult (30-49)", value: 4 },
  { name: "Senior (50+)", value: 5 },
];

// ---------------------------------------------------------------------------------------

/**
 * @async
 * @param {ModalSubmitInteraction} ModalInteraction
 * @param {ChatInputCommandInteraction} CmdInteraction
 */
async function FollowUp(CmdInteraction, ModalInteraction) {
  const ChargesText = ModalInteraction.fields.getTextInputValue("charges-text");
  const ChargesFormatted = FormatCharges(ChargesText);
  const Options = {
    Username: CmdInteraction.options.getString("name"),
    Gender: CmdInteraction.options.getInteger("gender") === 1 ? "Male" : "Female",
    Age: FormatAge(CmdInteraction.options.getInteger("arrest-age")),
    Height: FormatHeight(CmdInteraction.options.getString("height")),
    Weight: CmdInteraction.options.getInteger("weight") + " lbs",
  };

  const UserID = await getIdFromUsername(Options.Username);
  const UserInfo = await getPlayerInfo(UserID);
  const Thumb = await getPlayerThumbnail(UserID, 150, "png", false, "headshot");

  const ConfirmationEmbed = new EmbedBuilder()
    .setTitle("Arrest Report - Confirmation")
    .setDescription("Please review the arrest report information before submittng it.")
    .setColor(Colors.Gold)
    .setThumbnail(Thumb?.[0]?.imageUrl ? Thumb[0].imageUrl : Thumbs.Avatar[Options.Gender])
    .setFields([
      {
        name: "Defendant Name",
        value: `${UserInfo.displayName} (@${Options.Username})`,
        inline: true,
      },
      {
        name: "Gender",
        value: Options.Gender,
        inline: true,
      },
      {
        name: "Arrest Age",
        value: Options.Age,
        inline: true,
      },
      {
        name: "Height",
        value: Options.Height,
        inline: true,
      },
      {
        name: "Weight",
        value: Options.Weight,
        inline: true,
      },
      {
        name: "Convicted Charges",
        value: ChargesFormatted,
        inline: false,
      },
    ]);

  const ButtonsActionRow = new ActionRowBuilder().setComponents(
    new ButtonBuilder()
      .setCustomId("confirm-report")
      .setLabel("Confirm Submission")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("cancel-report")
      .setLabel("Cancel Submission")
      .setStyle(ButtonStyle.Danger)
  );

  if (!ModalInteraction.replied) {
    ModalInteraction.reply({
      embeds: [ConfirmationEmbed],
      components: [ButtonsActionRow],
      ephemeral: true,
    });
  } else {
    ModalInteraction.followUp({
      embeds: [ConfirmationEmbed],
      components: [ButtonsActionRow],
      ephemeral: true,
    });
  }
}

/**
 * @async
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  const Modal = new ModalBuilder()
    .setTitle("Arrest Report - Charges")
    .setCustomId(`arrest-report-${RandomString(10)}`);
  const ChargesActionRow = new ActionRowBuilder().setComponents(
    new TextInputBuilder()
      .setLabel("Convicted Charges")
      .setStyle(TextInputStyle.Paragraph)
      .setCustomId("charges-text")
      .setPlaceholder("1.\n2.\n3.")
      .setMinLength(6)
      .setMaxLength(550)
  );
  const NotesActionRow = new ActionRowBuilder().setComponents(
    new TextInputBuilder()
      .setLabel("Arrest Notes")
      .setStyle(TextInputStyle.Short)
      .setCustomId("notes-text")
      .setPlaceholder("e.g., known to be in a gang.")
      .setMinLength(6)
      .setMaxLength(100)
      .setRequired(false)
  );

  const ModalFilter = (MS) => {
    return MS.user.id === Interaction.user.id && MS.customId === Modal.data.custom_id;
  };

  Modal.addComponents(ChargesActionRow, NotesActionRow);
  await Interaction.showModal(Modal);
  await Interaction.awaitModalSubmit({ time: 5 * 60_000, filter: ModalFilter })
    .then(async (Submission) => {
      await FollowUp(Interaction, Submission);
    })
    .catch(async (Err) => {
      if (!Err.message.match(/reason: (.+)/)?.[1].match(/time/i)) {
        await Interaction.followUp({
          embeds: [
            new ErrorEmbed().setDescription("Something went wrong while executing this command."),
          ],
          ephemeral: true,
        });

        console.warn(
          "%s - Error occurred while processing modal submission. Exiting with error:",
          Chalk.red("Log Arrest"),
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
    .setName("arrest")
    .setDescription(
      "Creates a database entry to log an arrest and generate a corresponding report."
    )
    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The username of the arrested suspect.")
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
    )
    .addIntegerOption((Option) =>
      Option.setName("gender")
        .setDescription("The gender of the arrested suspect; either male or female.")
        .setRequired(true)
        .addChoices({ name: "Male", value: 1 }, { name: "Female", value: 2 })
    )
    .addIntegerOption((Option) =>
      Option.setName("arrest-age")
        .setDescription("The age category of the suspect at the arrest time.")
        .setRequired(true)
        .addChoices(...ArrestAges)
    )
    .addStringOption((Option) =>
      Option.setName("height")
        .setDescription("The height of the arrested suspect in feet and inches.")
        .setAutocomplete(true)
        .setRequired(true)
        .setMinLength(4)
        .setMaxLength(5)
    )
    .addIntegerOption((Option) =>
      Option.setName("weight")
        .setDescription("The weight of the arrested suspect in pounds (lbs).")
        .setRequired(true)
        .setMinValue(25)
        .setMaxValue(700)
        .setAutocomplete(true)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;