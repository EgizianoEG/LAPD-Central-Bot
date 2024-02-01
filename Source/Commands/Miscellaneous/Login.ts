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

import { DummyText } from "@Utilities/Strings/Random.js";
import { ErrorMessages } from "@Resources/AppMessages.js";
import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import { IsValidRobloxUsername } from "@Utilities/Other/Validators.js";
import { InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import Util from "node:util";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";
import IsUserLoggedIn from "@Utilities/Database/IsUserLoggedIn.js";
import GetIdByUsername from "@Utilities/Roblox/GetIdByUsername.js";
import AutocompleteUsername from "@Utilities/Autocompletion/Username.js";
import UpdateLinkedRobloxUser from "@Utilities/Database/UpdateLinkedUser.js";
import HandleButtonCollectorExceptions from "@Utilities/Other/HandleButtonCollectorExceptions.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Validates the entered Roblox username before continuing
 * @param Interaction - The interaction object.
 * @param InputUsername - The Roblox username to be validated.
 * @returns The interaction reply (an error reply) if validation failed; otherwise `undefined`
 */
async function HandleInvalidUsername(
  Interaction: SlashCommandInteraction,
  InputUsername: string
): Promise<Message<boolean> | InteractionResponse<boolean> | undefined> {
  if (Interaction.replied) return;
  if (!IsValidRobloxUsername(InputUsername)) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: ErrorMessages.MalformedRobloxUsername.Title,
      Message: Util.format(ErrorMessages.MalformedRobloxUsername.Description, InputUsername),
    });
  } else if ((await GetIdByUsername(InputUsername))[2] === false) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: ErrorMessages.NonexistentRobloxUsername.Title,
      Message: Util.format(ErrorMessages.NonexistentRobloxUsername.Description, InputUsername),
    });
  }
}

/**
 * Checks whether or not the command runner is already logged into the application and if so, halts any further execution
 * @param Interaction - The interaction object.
 */
async function HandleUserLoginStatus(Interaction: SlashCommandInteraction<"cached">) {
  if (Interaction.replied) return;
  const UserLoggedIn = await IsUserLoggedIn(Interaction);
  if (UserLoggedIn) {
    const LoggedUsername = (await GetUserInfo(UserLoggedIn)).name;
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: ErrorMessages.RobloxUserAlreadyLinked.Title,
      Message: Util.format(ErrorMessages.RobloxUserAlreadyLinked.Description, LoggedUsername),
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
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const InputUsername = Interaction.options.getString("username", true);

  await HandleUserLoginStatus(Interaction);
  await HandleInvalidUsername(Interaction, InputUsername);
  if (Interaction.replied) return;

  const SampleText = DummyText();
  const [RobloxUserId, RobloxUsername] = await GetIdByUsername(InputUsername);

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

  await ProcessPrompt.awaitMessageComponent({
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  })
    .then(async (ButtonInteract) => {
      await DisablePrompt();
      if (ButtonInteract.customId === "confirm-login") {
        const CurrentAbout = (await GetUserInfo(RobloxUserId)).description;

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
            Message: Util.format(
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
    .catch((Err) => HandleButtonCollectorExceptions(Err, DisablePrompt));
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
  options: { cooldown: 30 },
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
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
