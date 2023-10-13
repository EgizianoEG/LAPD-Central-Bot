// Dependencies:
// -------------

import {
  Colors,
  Message,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ButtonBuilder,
  escapeMarkdown,
  ActionRowBuilder,
  SlashCommandBuilder,
  InteractionResponse,
  AutocompleteInteraction,
} from "discord.js";

import GetPlayerInfo from "@Utilities/Roblox/GetPlayerInfo.js";
import IsUserLoggedIn from "@Utilities/Database/IsUserLoggedIn.js";
import GetIdFromUsername from "@Utilities/Roblox/UserIdByUsername.js";
import AutocompleteUsername from "@Utilities/Autocompletion/Username.js";
import UpdateLinkedRobloxUser from "@Utilities/Database/UpdateLinkedUser.js";

import { InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { IsValidRobloxUsername } from "@Utilities/Other/Validator.js";
import { format as FormatStr } from "node:util";
import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import { DummyText } from "@Utilities/Strings/Random.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Validates the entered Roblox username before continuing
 * @param Interaction - The interaction object.
 * @param RobloxUsername - The Roblox username to be validated.
 * @returns The interaction reply (an error reply) if validation failed; otherwise `undefined`
 */
async function HandleInvalidUsername(
  Interaction: SlashCommandInteraction,
  RobloxUsername: string
): Promise<Message<boolean> | InteractionResponse<boolean> | undefined> {
  if (Interaction.replied) return;
  if (!IsValidRobloxUsername(RobloxUsername)) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: "Malformed Username",
      Message: FormatStr(
        "The provided username, `%s`, is malformed.\n",
        RobloxUsername,
        "The username can be 3 to 20 characters long and can only contain letters, digits, and one underscore character in between."
      ),
    });
  } else if ((await GetIdFromUsername(RobloxUsername)) === null) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: "Hold up!",
      Message: FormatStr(
        "Cannot find the input user, `%s`, on Roblox. Please ensure that the username is valid and try again.",
        RobloxUsername
      ),
    });
  }
}

/**
 * Checks whether or not the command runner is already logged into the application and if so, halts any further execution
 * @param Interaction - The interaction object.
 */
async function HandleUserLoginStatus(Interaction: SlashCommandInteraction) {
  if (Interaction.replied) return;
  const UserLoggedIn = await IsUserLoggedIn(Interaction);
  if (UserLoggedIn) {
    const LoggedUsername = (await GetPlayerInfo(UserLoggedIn)).name;
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: "Hold up!",
      Message: FormatStr(
        "You are already logged in as `%s`.\nDid you mean to log out instead?",
        LoggedUsername
      ),
    });
  }
}

/**
 * Handles command execution logic
 * @param _ - The Discord.js client object.
 * @param Interaction - The interaction object.
 * @todo - Add verification by following user or by joining a game.
 * @execution
 * This function executes the following steps:
 * 1. Retrieve the provided Roblox username from the interaction options.
 * 2. Check if the user is already logged in; if so, inform the user and return.
 * 3. Validate the provided Roblox username for correctness.
 * 4. If any validation responded the interaction, return early.
 * 5. Construct an embed to guide the user through the login process.
 * 6. Create buttons for "Verify and Login" and "Cancel Login".
 * 7. Send the embed and buttons to the user as a reply.
 * 8. Await button interaction within a time limit of five minutes (converted into milliseconds).
 * 9. Based on button interaction received:
 *    - If "Verify and Login" is clicked, validate the profile description.
 *    - If "Cancel Login" is clicked, provide a cancellation message.
 * 10. Handle errors and timeouts with appropriate responses.
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction) {
  const InputUsername = Interaction.options.getString("username", true);

  await HandleUserLoginStatus(Interaction);
  await HandleInvalidUsername(Interaction, InputUsername);
  if (Interaction.replied) return;

  const [RobloxUserId, RobloxUsername] = (await GetIdFromUsername(InputUsername)) as [
    number,
    string,
  ];

  const SampleText = DummyText();
  const ProcessEmbed = new EmbedBuilder()
    .setColor(Colors.Aqua)
    .setTitle("Login Process - " + escapeMarkdown(RobloxUsername))
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
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel("Profile")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://www.roblox.com/users/${RobloxUserId}`)
  ) as ActionRowBuilder<ButtonBuilder>;

  const ProcessPrompt = await Interaction.reply({
    ephemeral: true,
    embeds: [ProcessEmbed],
    components: [ButtonsActionRow],
  });

  const DisablePrompt = () => {
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    return ProcessPrompt.edit({
      components: [ButtonsActionRow],
    });
  };

  const HandleCollectorExceptions = async (Err) => {
    if (Err.message.match(/reason: time/)) {
      await DisablePrompt();
      return SendErrorReply({
        Ephemeral: true,
        Interaction,
        Title: "Process Cancelled",
        Message:
          "The login process has been terminated due to no response being received within five minutes.",
      });
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion */
    } else {
      throw Err;
    }
  };

  await ProcessPrompt.awaitMessageComponent({
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  })
    .then(async (ButtonInteract) => {
      await DisablePrompt();
      if (ButtonInteract.customId === "confirm-login") {
        const CurrentAbout = (await GetPlayerInfo(RobloxUserId)).description;

        if (CurrentAbout.includes(SampleText)) {
          await UpdateLinkedRobloxUser(Interaction, RobloxUserId);
          return new SuccessEmbed()
            .setDescription("Successfully verified and logged in as `%s`.", RobloxUsername)
            .replyToInteract(ButtonInteract, true);
        } else {
          return SendErrorReply({
            Ephemeral: true,
            Interaction: ButtonInteract,
            Title: "Verification Failed",
            Message: FormatStr(
              "Login verification as `%s` failed.\nPlease rerun the command and ensure you follow the appropriate instructions.",
              RobloxUsername
            ),
          });
        }
      } else {
        return new InfoEmbed()
          .setTitle("Process Cancellation")
          .setDescription("The login process has been canceled due to user request.")
          .replyToInteract(ButtonInteract, true);
      }
    })
    .catch(HandleCollectorExceptions);
}

/**
 * Autocompletion for the Roblox username required command option
 * @param Interaction
 * @returns
 */
async function Autocomplete(Interaction: AutocompleteInteraction): Promise<void> {
  const { name, value } = Interaction.options.getFocused(true);
  let Suggestions: { name: string; value: string }[];

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
const CommandObject: SlashCommandObject<any> = {
  data: new SlashCommandBuilder()
    .setName("log-in")
    .setDescription("Log into the application and get access to restricted actions.")
    .setDMPermission(false)
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
  options: {
    cooldown: 30,
  },
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
