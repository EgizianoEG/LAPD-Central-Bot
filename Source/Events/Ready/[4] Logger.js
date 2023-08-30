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
const GetPresence = require("../../Utilities/Roblox/GetPresence");
/* eslint-enable */

/**
 * Development logger
 * @param {Client} Client
 */
module.exports = async (Client) => {
  console.time();
};
