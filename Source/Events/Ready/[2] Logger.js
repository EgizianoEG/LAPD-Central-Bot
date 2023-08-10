/* eslint-disable */
const Chalk = require("chalk");
// const GetPlayerInfo = require("../../Utilities/Roblox/GetPlayerInfo");
const UserIdByUsername = require("../../Utilities/Roblox/UserIdByUsername");
const {
  Client,
  escapeMarkdown,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
  ComponentType,
} = require("discord.js");
/* eslint-enable */

/**
 * Development logger
 * @param {Client} Client
 */
module.exports = async (Client) => {
  console.time();

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

  ButtonsActionRow.disable = function disable() {
    ButtonsActionRow.components.forEach((Button) => Button.setDisabled(true));
    return this;
  };

  // console.log(ButtonsActionRow.toJSON());
  // console.log(ButtonsActionRow.disable().toJSON());
  // console.log(ButtonsActionRow.toJSON());
};
