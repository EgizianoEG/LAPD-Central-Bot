/* eslint-disable no-extra-parens */
/* eslint-disable no-unused-vars */
// TODO: add verification by following or by joining a game
// Requires:

const {
  Client,
  Colors,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ButtonBuilder,
  escapeMarkdown,
  ActionRowBuilder,
  SlashCommandBuilder,
  InteractionResponse,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} = require("discord.js");

const GetPlayerInfo = require("../../Utilities/Roblox/GetPlayerInfo");
const IsUserLoggedIn = require("../../Utilities/Database/IsUserLoggedIn");
const GetIdFromUsername = require("../../Utilities/Roblox/UserIdByUsername");
const AutocompleteUsername = require("../../Utilities/Autocompletion/Username");
const UpdateLinkedRobloxUser = require("../../Utilities/Database/UpdateLinkedUser");
const { ErrorEmbed, InfoEmbed, SuccessEmbed } = require("../../Utilities/General/ExtraEmbeds");
const { IsValidRobloxUsername } = require("../../Utilities/Strings/Validator");
const { DummyText } = require("../../Utilities/Strings/Random");

// ------------------------------------------------------------------------------------
// Functions:
// -----------
/**
 * Sends an error embed with a specific title and description.
 * @param {*} Interaction
 * @param {String} Title
 * @param {Any} Description
 * @returns {Promise<void>}
 */
function SendErrorEmbed(Interaction, Title, ...Description) {
  return Interaction.reply({
    ephemeral: true,
    embeds: [new ErrorEmbed().setTitle(Title).setDescription(...Description)],
  });
}

/**
 * Validates entered username before continuing
 * @param {ChatInputCommandInteraction} Interaction
 * @returns {Promise<(InteractionResponse|undefined)>}
 */
async function HandleInvalidUsername(Interaction, RobloxUsername) {
  if (Interaction.replied) return;
  if (!IsValidRobloxUsername(RobloxUsername)) {
    return SendErrorEmbed(
      Interaction,
      "Malformed Username",
      "The provided username, `%s`, is malformed.\n",
      RobloxUsername,
      "The username can be 3 to 20 characters long and can only contain letters, digits, and one underscore character in between."
    );
  } else if ((await GetIdFromUsername(RobloxUsername)) === null) {
    return SendErrorEmbed(
      Interaction,
      "Hold up!",
      "Cannot find the input user, `%s`, on Roblox. Please ensure that the username is valid and try again.",
      RobloxUsername
    );
  }
}

/**
 * Checks whether or not the command runner is already logged into the application and if so, halts any furthur execution
 * @param {ChatInputCommandInteraction} Interaction
 * @returns {Promise<(InteractionResponse|undefined)>}
 */
async function HandleLoggedInUser(Interaction) {
  const UserLoggedIn = await IsUserLoggedIn(Interaction);
  if (Interaction.replied) return;
  if (UserLoggedIn) {
    const LoggedUsername = (await GetPlayerInfo(UserLoggedIn)).name;
    return SendErrorEmbed(
      Interaction,
      "Hold up!",
      "You are already logged in as `%s`.\nDid you mean to log out instead?",
      LoggedUsername
    );
  }
}

/**
 * Handles command execution logic
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  const RobloxUsername = Interaction.options.getString("username", true);

  await HandleLoggedInUser(Interaction);
  await HandleInvalidUsername(Interaction, RobloxUsername);
  if (Interaction.replied) return;

  const SampleText = DummyText();
  const ProcessEmbed = new EmbedBuilder()
    .setTitle("Login Process - " + escapeMarkdown(RobloxUsername))
    .setColor(Colors.Aqua)
    .setDescription(
      "To verify your login, kindly modify the About/Description section of your Roblox Profile to include the provided sample text below.\n" +
        "- When finished, press the `Verify and Login` button\n" +
        "- To cancel the login process, press the `Cancel Login` button\n" +
        "- **Note**: The login process will be automatically canceled if no response is received within 5 minutes.\n" +
        `\`\`\`fix\n${SampleText}\n\`\`\``
    );

  const ButtonsActionRow = new ActionRowBuilder().setComponents(
    new ButtonBuilder()
      .setLabel("Verify and Login")
      .setCustomId("confirm-login")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setLabel("Cancel Login")
      .setCustomId("cancel-login")
      .setStyle(ButtonStyle.Secondary)
  );

  const ProcessPrompt = await Interaction.reply({
    ephemeral: true,
    embeds: [ProcessEmbed],
    components: [ButtonsActionRow],
  });

  const DisablePrompt = () => {
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    return ProcessPrompt.edit({
      embeds: [ProcessEmbed],
      components: [ButtonsActionRow],
    });
  };

  try {
    const ReceivedButtonAction = await ProcessPrompt.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 5 * 60_000,
    });

    if (ReceivedButtonAction.customId === "confirm-login") {
      const RobloxUserId = await GetIdFromUsername(RobloxUsername);
      const CurrentAbout = (await GetPlayerInfo(RobloxUserId)).description;

      if (CurrentAbout.includes(SampleText)) {
        await DisablePrompt();
        await UpdateLinkedRobloxUser(Interaction, RobloxUserId);
        return ReceivedButtonAction.reply({
          ephemeral: true,
          embeds: [
            new SuccessEmbed().setDescription(
              "Successfully verified and logged in as `%s`.",
              RobloxUsername
            ),
          ],
        });
      } else {
        await DisablePrompt();
        return SendErrorEmbed(
          ReceivedButtonAction,
          "Verification Failed",
          "Login verification as `%s` failed.\nPlease rerun the command and ensure you follow the appropriate instructions.",
          RobloxUsername
        );
      }
    } else {
      await DisablePrompt();
      return ReceivedButtonAction.reply({
        ephemeral: true,
        embeds: [
          new InfoEmbed("The login process has been canceled.").setTitle("Process Cancellation"),
        ],
      });
    }
  } catch (Err) {
    if (Err.message.match(/reason: (.+)/)?.[1].match(/time/i)) {
      await DisablePrompt();
      return Interaction.followUp({
        ephemeral: true,
        embeds: [
          new ErrorEmbed()
            .setTitle("Process Cancelled")
            .setDescription(
              "The login process has been terminated due to no response being received within five minutes."
            ),
        ],
      });
    } else {
      throw Err;
    }
  }
}

/**
 * Autocompletion for the command option(s)
 * @param {AutocompleteInteraction} Interaction
 */
async function Autocomplete(Interaction) {
  const { name, value } = Interaction.options.getFocused(true);
  let Suggestions;

  if (name === "username") {
    Suggestions = await AutocompleteUsername(value);
  } else {
    Suggestions = [];
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName("log-in")
    .setDescription("Log into the application and get access to restricted actions.")
    .addStringOption((Option) =>
      Option.setName("username")
        .setDescription("The Roblox username to log in as.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(true)
        .setAutocomplete(true)
    ),
  callback: Callback,
  autocomplete: Autocomplete,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
