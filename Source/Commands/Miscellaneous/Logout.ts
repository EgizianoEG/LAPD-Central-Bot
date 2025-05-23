// Dependencies:
// -------------

import {
  Colors,
  EmbedBuilder,
  ComponentType,
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
  ButtonStyle,
} from "discord.js";

import { ErrorMessages } from "@Resources/AppMessages.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";
import IsUserLoggedIn from "@Utilities/Database/IsUserLoggedIn.js";
import UpdateLinkedRobloxUser from "@Utilities/Database/UpdateLinkedUser.js";

// ---------------------------------------------------------------------------------------
// Functions:
// -----------
/**
 * Handles the case where the command runner is not logged in
 * @param Interaction
 * @param IsLoggedIn
 * @returns A boolean indication if the interaction was handled or not.
 */
async function HandleLoggedInUser(
  Interaction: SlashCommandInteraction,
  IsLoggedIn: boolean
): Promise<boolean> {
  if (!IsLoggedIn) {
    return Interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        new ErrorEmbed()
          .setTitle(ErrorMessages.LORobloxUserNotLinked.Title)
          .setDescription(ErrorMessages.LORobloxUserNotLinked.Description),
      ],
    }).then(() => true);
  }
  return false;
}

/**
 * Handles the logic for the command interaction to log out and unlink a Roblox account.
 * @param Interaction
 * @execution
 * This function executes the following steps:
 * 1. Check if the command runner is already logged in; if not, provide an error message.
 * 2. Retrieve the logged-in user's Roblox username.
 * 3. Create buttons for "Confirm and Log Out" and "Cancel".
 * 4. Send a prompt embed along with the buttons to the user.
 * 5. Await a button interaction within a time limit.
 * 6. Based on the button interaction:
 *    - If "Confirm and Log Out" is clicked, update linked Roblox user data, disable the prompt, and reply with a success message.
 *    - If "Cancel" is clicked, disable the prompt and reply with a cancellation message.
 * 7. Handle errors, including timeouts, with appropriate responses.
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const UserLoggedIn = await IsUserLoggedIn(Interaction);
  if (await HandleLoggedInUser(Interaction, !!UserLoggedIn)) return;

  const RobloxUsername = (await GetUserInfo(UserLoggedIn)).name;
  const ButtonsActionRow = new ActionRowBuilder().setComponents(
    new ButtonBuilder()
      .setLabel("Confirm and Log Out")
      .setCustomId("confirm-logout")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setLabel("Cancel")
      .setCustomId("cancel-logout")
      .setStyle(ButtonStyle.Secondary)
  ) as ActionRowBuilder<ButtonBuilder>;

  const PromptEmbed = new EmbedBuilder()
    .setTitle("Logout Process")
    .setColor(Colors.Aqua)
    .setDescription(
      `Are you sure that you want to log out and unlink your Roblox account, \`${RobloxUsername}\`, from the application?\n` +
        "- To confirm your log out, press the `Confirm and Log Out` button\n" +
        "- To cancel the logout, press the `Cancel` button\n\n" +
        "*This prompt will automatically cancel after 5 minutes of inactivity.*"
    );

  const PromptReply = await Interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [PromptEmbed],
    components: [ButtonsActionRow],
  });

  const DisablePrompt = () => {
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    return PromptReply.edit({
      components: [ButtonsActionRow],
    });
  };

  return PromptReply.awaitMessageComponent({
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  })
    .then(async (ButtonAction) => {
      await ButtonAction.deferUpdate();
      if (ButtonAction.customId === "confirm-logout") {
        await UpdateLinkedRobloxUser(Interaction);
        return ButtonAction.editReply({
          components: [],
          embeds: [
            new SuccessEmbed().setDescription(
              "Successfully unlinked Roblox account and logged out of the application for user `%s`.",
              RobloxUsername
            ),
          ],
        });
      } else {
        return ButtonAction.editReply({
          components: [],
          embeds: [
            new InfoEmbed()
              .setTitle("Process Cancellation")
              .setDescription("Logout process has been cancelled."),
          ],
        });
      }
    })
    .catch(async (Err) => {
      if (Err.message.match(/reason: time/)) {
        return DisablePrompt();
      } else if (Err.message.match(/reason: \w+Delete/)) {
        /* Ignore message/channel/guild deletion */
      } else {
        throw Err;
      }
    });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  data: new SlashCommandBuilder()
    .setName("log-out")
    .setDescription("Log out and unlink the associated Roblox account from the application.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild),

  callback: Callback,
  options: {
    cooldown: 30,
  },
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
