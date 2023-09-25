const { SlashCommandBuilder } = require("discord.js");
const { UnauthorizedEmbed } = require("../../../Utilities/Classes/ExtraEmbeds");
const DutyTypesSubcommandGroup = require("./Duty Types/Main");
const AutocompleteShiftType = require("../../../Utilities/Autocompletion/ShiftType");
const UserHasPerms = require("../../../Utilities/Database/UserHasPermissions");

const ManagementAuthorizedCmds = ["types", "wipe-all", "admin"];
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
 * Authorize a management slash command usage; returns `true` is it is authorized or `false` otherwise.
 * All commands except management ones are usable by staff identified members.
 * @param {SlashCommandInteraction<"cached">} Interaction
 */
async function IsAuthorizedCmdUsage(Interaction) {
  const SubcmdName = Interaction.options.getSubcommand();
  const SubcmdGroupName = Interaction.options.getSubcommandGroup() ?? "";

  if (
    ManagementAuthorizedCmds.includes(SubcmdName) ||
    ManagementAuthorizedCmds.includes(SubcmdGroupName)
  ) {
    if (!(await UserHasPerms(Interaction, { management: true }))) {
      await new UnauthorizedEmbed()
        .setDescription(
          "You do not have the necessary permissions to perform and use this command.\n",
          "- Permissions Required:\n",
          " - Manage Server; or\n",
          " - Application (Bot) Management"
        )
        .replyToInteract(Interaction, true);
      return false;
    }
    return true;
  }

  if (!(await UserHasPerms(Interaction, { staff: true }))) {
    await new UnauthorizedEmbed()
      .setDescription(
        "You do not have the necessary permissions to perform and use this command.\n",
        "- Permissions Required:\n",
        " - Manage Server; or\n",
        " - A Staff Role Associated With the Application"
      )
      .replyToInteract(Interaction, true);
    return false;
  }

  return true;
}

/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction<"cached">} Interaction
 */
async function Callback(Client, Interaction) {
  const SubCommandName = Interaction.options.getSubcommand();
  const SubCommandGroupName = Interaction.options.getSubcommandGroup();

  if (!(await IsAuthorizedCmdUsage(Interaction))) return;
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
      : [{ name: "[Unauthorized]", value: "0" }];

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
