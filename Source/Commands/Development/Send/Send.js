const { SlashCommandBuilder } = require("discord.js");
const SubCommands = [require("./Deps/Embed"), require("./Deps/ArrestReport")];
// ---------------------------------------------------------------------------------------

/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  for (const SubCommand of SubCommands) {
    if (SubCommand.data.name === Interaction.options.getSubcommand()) {
      if (typeof SubCommand.callback === "function") {
        return SubCommand.callback(Client, Interaction);
      } else {
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  options: {
    devOnly: true,
  },
  data: new SlashCommandBuilder()
    .setName("send")
    .setDescription("Sends a specific information.")
    .addSubcommand(SubCommands[0].data)
    .addSubcommand(SubCommands[1].data),
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
