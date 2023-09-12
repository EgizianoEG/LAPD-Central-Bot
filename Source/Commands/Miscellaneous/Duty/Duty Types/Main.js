const { SlashCommandSubcommandGroupBuilder } = require("discord.js");
const { UnauthorizedEmbed } = require("../../../../Utilities/Classes/ExtraEmbeds");
const UserHasPerms = require("../../../../Utilities/Database/UserHasPermissions");

const Subcommands = [
  require("./Subcmds/View"),
  require("./Subcmds/Create"),
  require("./Subcmds/Delete"),
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction<"cached">} Interaction
 */
async function Callback(Client, Interaction) {
  const SubcommandName = Interaction.options.getSubcommand();

  if (!(await UserHasPerms(Interaction, { management: true }))) {
    return new UnauthorizedEmbed()
      .setDescription(
        "You do not have the necessary permissions to perform and use this command.\n",
        "- Permissions Required:\n",
        " - Manage Server; or\n",
        " - Application (Bot) Management"
      )
      .replyToInteract(Interaction, true);
  }

  for (const Subcommand of Subcommands) {
    if (Subcommand.data.name === SubcommandName) {
      if (typeof Subcommand.callback === "function") {
        return Subcommand.callback(Client, Interaction);
      } else {
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const SubcommandGroupObject = {
  data: new SlashCommandSubcommandGroupBuilder()
    .setName("types")
    .setDescription("Duty shift type and its related actions."),

  callback: Callback,
};

for (const Subcommand of Subcommands) {
  SubcommandGroupObject.data.addSubcommand(Subcommand.data);
}

// ---------------------------------------------------------------------------------------
module.exports = SubcommandGroupObject;
