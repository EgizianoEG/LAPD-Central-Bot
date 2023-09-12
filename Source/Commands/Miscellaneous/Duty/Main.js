const { SlashCommandBuilder } = require("discord.js");
const DutyTypesSubcommandGroup = require("./Duty Types/Main");
const AutocompleteShiftType = require("../../../Utilities/Autocompletion/ShiftType");
const UserHasPerms = require("../../../Utilities/Database/UserHasPermissions");

const Subcommands = [
  require("./Subcmds/Active"),
  require("./Subcmds/Admin"),
  require("./Subcmds/Leaderboard"),
  require("./Subcmds/Manage"),
  require("./Subcmds/WipeAll"),
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction<"cached">} Interaction
 */
function Callback(Client, Interaction) {
  const SubCommandName = Interaction.options.getSubcommand();
  const SubCommandGroupName = Interaction.options.getSubcommandGroup();

  for (const SubCommand of Subcommands) {
    if (SubCommand.data.name === SubCommandName) {
      if (typeof SubCommand.callback === "function") {
        return SubCommand.callback(Client, Interaction);
      } else {
        return;
      }
    }
  }

  if (SubCommandGroupName === "types" && typeof DutyTypesSubcommandGroup.callback === "function") {
    return DutyTypesSubcommandGroup.callback(Client, Interaction);
  }
}

/**
 * @param {DiscordJS.AutocompleteInteraction<"cached">} Interaction
 * @returns {Promise<void>}
 */
async function Autocomplete(Interaction) {
  const { name, value } = Interaction.options.getFocused(true);
  const SubcommandGroup = Interaction.options.getSubcommandGroup();
  const SubcommandName = Interaction.options.getSubcommand();
  const Suggestions =
    name === "type" ||
    (name === "name" &&
      SubcommandGroup === "types" &&
      SubcommandName === "delete" &&
      (await UserHasPerms(Interaction, { management: true })))
      ? await AutocompleteShiftType(value, Interaction.guildId)
      : [];

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
/** @type {SlashCommandObject} */
const CommandObject = {
  options: { cooldown: 5 },
  data: new SlashCommandBuilder()
    .setName("duty")
    .setDescription("Duty related actions.")
    .addSubcommandGroup(DutyTypesSubcommandGroup.data)
    .setDMPermission(false),

  callback: Callback,
  autocomplete: Autocomplete,
};

// ---------------------------------------------------------------------------------------
for (const SubCommand of Subcommands) {
  CommandObject.data.addSubcommand(SubCommand.data);
}

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
