// Dependencies:
// -------------

import {
  Colors,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ButtonBuilder,
  escapeMarkdown,
  ActionRowBuilder,
  SlashCommandBuilder,
  InteractionContextType,
  AutocompleteInteraction,
} from "discord.js";

import { DummyText } from "@Utilities/Strings/Random.js";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import { IsValidRobloxUsername } from "@Utilities/Other/Validators.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";
import GetRobloxIdFromDiscordBloxlink from "@Utilities/Roblox/GetRbxIdBloxLink.js";
import UpdateLinkedRobloxUser from "@Utilities/Database/UpdateLinkedUser.js";
import AutocompleteUsername from "@Utilities/Autocompletion/Username.js";
import GetIdByUsername from "@Utilities/Roblox/GetIdByUsername.js";
import IsUserLoggedIn from "@Utilities/Database/IsUserLoggedIn.js";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";

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

/**
 * Handles command execution logic
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
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const InputUsername = Interaction.options.getString("username", true);
  if (
    (await HandleUserLoginStatus(Interaction)) ||
    (await HandleInvalidUsername(Interaction, InputUsername))
  ) {
    return;
  }

  if (Interaction.options.getBoolean("use-bloxlink") === true) {
    return HandleBloxlinkVerification(Interaction);
  } else {
    return HandleManualVerification(Interaction, InputUsername);
  }
}

async function HandleBloxlinkVerification(CmdInteract: SlashCommandInteraction<"cached">) {
  await CmdInteract.deferReply({ ephemeral: true });
  const FoundRobloxId = await GetRobloxIdFromDiscordBloxlink(CmdInteract.user.id).catch(() => null);

  if (FoundRobloxId) {
    await UpdateLinkedRobloxUser(CmdInteract, FoundRobloxId);
    const RobloxAccountInfo = await GetUserInfo(FoundRobloxId);

    return CmdInteract.editReply({
      embeds: [
        new SuccessEmbed()
          .setTitle("Successfully Linked")
          .setDescription(
            `Your Roblox account, ${FormatUsername(RobloxAccountInfo, false, true)}, was successfully linked to your Discord account.`
          ),
      ],
    });
  } else {
    return new ErrorEmbed()
      .useErrTemplate("BloxlinkLinkingFailed")
      .replyToInteract(CmdInteract, true, true, "editReply");
  }
}

async function HandleManualVerification(
  CmdInteract: SlashCommandInteraction<"cached">,
  InputUsername: string
) {
  const SampleText = DummyText();
  const [RobloxUserId, RobloxUsername] = await GetIdByUsername(InputUsername);

  const ProcessEmbed = new EmbedBuilder()
    .setColor(Colors.Aqua)
    .setTitle(`Login Process - @${escapeMarkdown(RobloxUsername)}`)
    .setDescription(
      "To verify your login, kindly modify the About/Description section of your Roblox Profile to include the provided sample text below.\n" +
        "- When finished, press the `Verify and Login` button\n" +
        "- To cancel the login process, press the `Cancel Login` button\n" +
        "- **Note**: This login process will be automatically cancelled if no response is received within 10 minutes.\n" +
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

  const ProcessPromptMsg = await CmdInteract.reply({
    ephemeral: true,
    fetchReply: true,
    embeds: [ProcessEmbed],
    components: [ButtonsActionRow],
  });

  const DisablePrompt = () => {
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    return ProcessPromptMsg.edit({
      components: [ButtonsActionRow],
    });
  };

  await ProcessPromptMsg.awaitMessageComponent({
    componentType: ComponentType.Button,
    time: 10 * 60 * 1000,
  })
    .then(async (ButtonInteract) => {
      await ButtonInteract.deferUpdate();
      if (ButtonInteract.customId === "confirm-login") {
        const CurrentAbout = (await GetUserInfo(RobloxUserId)).description;
        if (CurrentAbout.includes(SampleText)) {
          await UpdateLinkedRobloxUser(CmdInteract, RobloxUserId);
          return ButtonInteract.editReply({
            components: [],
            embeds: [
              new SuccessEmbed()
                .setTitle("Successfully Linked")
                .setDescription(
                  "Your Roblox account has successfully been verified and linked to the application. You may now remove the sample text from your profile description."
                ),
            ],
          });
        } else {
          return new ErrorEmbed()
            .useErrTemplate("RobloxUserVerificationFailed", InputUsername)
            .replyToInteract(CmdInteract, true);
        }
      } else {
        return new InfoEmbed()
          .setTitle("Process Cancellation")
          .setDescription("The login process has been cancelled due to your request.")
          .replyToInteract(ButtonInteract, true);
      }
    })
    .catch((Err) => HandleActionCollectorExceptions(Err, DisablePrompt));
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
  options: { cooldown: 30, user_perms: { staff: true } },
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
    )
    .addBooleanOption((Option) =>
      Option.setName("use-bloxlink")
        .setDescription(
          "Attempt to use Bloxlink integration to log in quickly. Availability may be limited."
        )
        .setRequired(false)
    ),

  callback: Callback,
  autocomplete: Autocomplete,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
