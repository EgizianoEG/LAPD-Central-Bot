// Dependencies:
// -------------

import {
  Colors,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ComponentType,
  ButtonBuilder,
  ActionRowBuilder,
  SlashCommandBuilder,
  InteractionContextType,
  AutocompleteInteraction,
} from "discord.js";

import { DummyText } from "@Utilities/Strings/Random.js";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import { IsValidRobloxUsername } from "@Utilities/Other/Validators.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import GetRobloxIdFromDiscordBloxlink from "@Utilities/Roblox/GetRbxIdBloxLink.js";
import UpdateLinkedRobloxUser from "@Utilities/Database/UpdateLinkedUser.js";
import AutocompleteUsername from "@Utilities/Autocompletion/Username.js";
import GetIdByUsername from "@Utilities/Roblox/GetIdByUsername.js";
import IsUserLoggedIn from "@Utilities/Database/IsUserLoggedIn.js";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";

// ---------------------------------------------------------------------------------------
// Helper Functions:
// -----------------
/**
 * Validates the entered Roblox username before continuing
 * @param Interaction - The interaction object.
 * @param InputUsername - The Roblox username to be validated.
 * @returns The interaction reply (an error reply) if validation failed; otherwise `undefined`
 */
async function HandleInvalidUsername(
  Interaction: SlashCommandInteraction,
  InputUsername: string
): Promise<boolean> {
  if (!IsValidRobloxUsername(InputUsername)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedRobloxUsername", InputUsername)
      .replyToInteract(Interaction, true)
      .then(() => true);
  } else if ((await GetIdByUsername(InputUsername))[2] === false) {
    return new ErrorEmbed()
      .useErrTemplate("NonexistentRobloxUsername", InputUsername)
      .replyToInteract(Interaction, true)
      .then(() => true);
  }
  return false;
}

/**
 * Checks whether or not the command runner is already logged into the application and if so, halts any further execution
 * @param Interaction - The interaction object.
 */
async function HandleUserLoginStatus(
  Interaction: SlashCommandInteraction<"cached">
): Promise<boolean> {
  const UserLoggedIn = await IsUserLoggedIn(Interaction);
  if (UserLoggedIn) {
    const LoggedUsername = (await GetUserInfo(UserLoggedIn)).name;
    return new ErrorEmbed()
      .useErrTemplate("RobloxUserAlreadyLinked", LoggedUsername)
      .replyToInteract(Interaction, true)
      .then(() => true);
  }
  return false;
}

// ---------------------------------------------------------------------------------------
// Command Handling:
// -----------------
/**
 * Handles command execution logic
 * @param CmdInteract - The interaction object.
 * @returns
 */
async function Callback(CmdInteract: SlashCommandInteraction<"cached">) {
  const InputUsername = CmdInteract.options.getString("username", true);
  if (
    (await HandleUserLoginStatus(CmdInteract)) ||
    (await HandleInvalidUsername(CmdInteract, InputUsername))
  ) {
    return;
  }

  await CmdInteract.deferReply({ flags: MessageFlags.Ephemeral });
  const [AccountRobloxId, ExactUsername] = await GetIdByUsername(InputUsername, true);
  const FoundBloxlinkRobloxId = await GetRobloxIdFromDiscordBloxlink(CmdInteract.user.id);

  if (FoundBloxlinkRobloxId === AccountRobloxId) {
    await UpdateLinkedRobloxUser(CmdInteract, AccountRobloxId);
    const RobloxAccountInfo = await GetUserInfo(AccountRobloxId);

    return CmdInteract.editReply({
      embeds: [
        new SuccessEmbed().useTemplate(
          "RobloxAccountLoginSuccess",
          FormatUsername(RobloxAccountInfo, false, true)
        ),
      ],
    });
  } else {
    return HandleManualVerification(CmdInteract, AccountRobloxId, ExactUsername);
  }
}

/**
 * Handles the manual verification process for a Roblox account login.
 *
 * This function sends a prompt to the user to verify their Roblox account by modifying their profile description.
 * The user is provided with a sample text to include in their profile description and buttons to confirm or cancel the login process.
 *
 * @param CmdInteract - The interaction object for the slash command.
 * @param AccountRobloxId - The Roblox Id of the account to be verified.
 * @param AccountExactUsername - The exact username of the Roblox account.
 * @returns A promise that resolves when the verification process is complete or cancelled.
 * @execution
 * The function performs the following steps:
 * 1. Sends a prompt to the user with instructions and buttons for verification.
 * 2. Sets up a collector to handle button interactions for confirming or cancelling the login.
 * 3. On confirmation, checks if the user's profile description contains the sample text.
 * 4. If verified, updates the linked Roblox user and sends a success message.
 * 5. If verification fails, sends an error message.
 * 6. On cancellation, sends a cancellation message.
 * 7. Disables the buttons and updates the message when the collector ends.
 */
async function HandleManualVerification(
  CmdInteract: SlashCommandInteraction<"cached">,
  AccountRobloxId: number,
  AccountExactUsername: string
) {
  const SampleText = DummyText();
  const ProcessEmbed = new EmbedBuilder()
    .setColor(Colors.Aqua)
    .setTitle(`Login Process - @${AccountExactUsername}`)
    .setDescription(
      "To verify your login, kindly modify the About/Description section of your Roblox Profile to include the provided sample text below.\n" +
        "- When finished, press the `Verify and Login` button\n" +
        "- To cancel the login process, press the `Cancel Login` button\n" +
        "- **Note**: This login process will be automatically cancelled if no response is received within 10 minutes.\n" +
        `\`\`\`fix\n${SampleText}\n\`\`\``
    );

  const ButtonsActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
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
      .setURL(`https://www.roblox.com/users/${AccountRobloxId}`)
  );

  const LoginPromptMsg = await CmdInteract.editReply({
    embeds: [ProcessEmbed],
    components: [ButtonsActionRow],
  });

  let AttemptsLeft = 2;
  const ComponentCollector = LoginPromptMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 10 * 60 * 1000,
  });

  ComponentCollector.on("collect", async function OnPromptAction(ButtonInteract) {
    await ButtonInteract.deferUpdate();
    if (ButtonInteract.customId.includes("confirm-login")) {
      const CurrentAccountInfo = await GetUserInfo(AccountRobloxId);
      if (CurrentAccountInfo.description.includes(SampleText)) {
        await UpdateLinkedRobloxUser(CmdInteract, AccountRobloxId);
        ComponentCollector.stop("Confirmed");

        return ButtonInteract.editReply({
          components: [],
          embeds: [
            new SuccessEmbed().useTemplate(
              "RobloxAccountLoginManualSuccess",
              FormatUsername(CurrentAccountInfo, false, true)
            ),
          ],
        });
      } else {
        if (--AttemptsLeft === 0) ComponentCollector.stop("Limit");
        return new ErrorEmbed()
          .useErrTemplate(
            AttemptsLeft === 0
              ? "RobloxUserVerificationFailedLimit"
              : "RobloxUserVerificationFailed",
            AccountExactUsername,
            AttemptsLeft ? AttemptsLeft : ""
          )
          .replyToInteract(ButtonInteract, true, true, "followUp");
      }
    } else if (ButtonInteract.customId.includes("cancel-login")) {
      ComponentCollector.stop("Cancelled");
      return new InfoEmbed()
        .setTitle("Login Cancelled")
        .setDescription("The login process has been cancelled due to your request.")
        .replyToInteract(ButtonInteract, true);
    } else {
      return ComponentCollector.stop();
    }
  });

  ComponentCollector.on("end", async (CIs, EndReason) => {
    if (!(EndReason !== "Cancelled" && EndReason !== "Confirmed")) return;
    const LastInteract = CIs.last() || CmdInteract;
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    LastInteract.editReply({ components: [ButtonsActionRow] });
  });
}

// ---------------------------------------------------------------------------------------
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
  options: { cooldown: 20, user_perms: { staff: true } },
  callback: Callback,
  autocomplete: Autocomplete,

  data: new SlashCommandBuilder()
    .setName("log-in")
    .setDescription("Log into the application and get access to restricted actions.")
    .setContexts(InteractionContextType.Guild)
    .addStringOption((Option) =>
      Option.setName("username")
        .setDescription("The Roblox username to log in as.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
