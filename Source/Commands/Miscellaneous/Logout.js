/* eslint-disable no-extra-parens */
// Dependencies:
// ------------------------------------------------------------------------------------

const {
  Colors,
  EmbedBuilder,
  ComponentType,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const GetPlayerInfo = require("../../Utilities/Roblox/GetPlayerInfo");
const IsUserLoggedIn = require("../../Utilities/Database/IsUserLoggedIn");
const UpdateLinkedRobloxUser = require("../../Utilities/Database/UpdateLinkedUser");
const { ErrorEmbed, InfoEmbed, SuccessEmbed } = require("../../Utilities/Classes/ExtraEmbeds");

// ------------------------------------------------------------------------------------
// Functions:
// -----------
/**
 * Handles the case where the command runner is not logged in
 * @param {SlashCommandInteraction} Interaction
 */
async function HandleLoggedInUser(Interaction, IsLoggedIn) {
  if (!IsLoggedIn) {
    return Interaction.reply({
      ephemeral: true,
      embeds: [
        new ErrorEmbed()
          .setTitle("Hold on!")
          .setDescription(
            "To log out of the application, you must be logged in and have linked your Roblox account already."
          ),
      ],
    });
  }
}

/**
 * Handles the logic for the command interaction to log out and unlink a Roblox account.
 * @param {DiscordClient} _
 * @param {SlashCommandInteraction} Interaction
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
async function Callback(_, Interaction) {
  const UserLoggedIn = await IsUserLoggedIn(Interaction);

  await HandleLoggedInUser(Interaction, UserLoggedIn);
  if (Interaction.replied) return;

  const RobloxUsername = (
    await GetPlayerInfo(
      /** @type {Number} */
      (UserLoggedIn)
    )
  ).name;

  const ButtonsActionRow =
    /** @type {ActionRowBuilder<ButtonBuilder>} */
    (new ActionRowBuilder()).setComponents(
      new ButtonBuilder()
        .setLabel("Confirm and Log Out")
        .setCustomId("confirm-logout")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setLabel("Cancel")
        .setCustomId("cancel-logout")
        .setStyle(ButtonStyle.Secondary)
    );

  const PromptEmbed = new EmbedBuilder()
    .setTitle("Logout Process")
    .setColor(Colors.Aqua)
    .setDescription(
      `Are you sure that you want to log out and unlink your Roblox account, \`${RobloxUsername}\`, from the application?\n` +
        "- To confirm your log out, press the `Confirm and Log Out` button\n" +
        "- To cancel the logout, press the `Cancel` button\n" +
        "*This prompt will automatically cancel after 5 minutes of inactivity.*"
    );

  const PromptReply = await Interaction.reply({
    ephemeral: true,
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
      await DisablePrompt();
      if (ButtonAction.customId === "confirm-logout") {
        await UpdateLinkedRobloxUser(Interaction);
        return ButtonAction.reply({
          ephemeral: true,
          embeds: [
            new SuccessEmbed().setDescription(
              "Successfully unlinked Roblox account and logged out of the application for user `%s`.",
              RobloxUsername
            ),
          ],
        });
      } else {
        return ButtonAction.reply({
          ephemeral: true,
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
        /* ignore message/channel/guild deletion */
      } else {
        throw Err;
      }
    });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName("log-out")
    .setDescription("Log out and unlink the associated Roblox account from the application."),
  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;