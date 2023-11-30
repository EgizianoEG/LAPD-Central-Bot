import { AutocompleteInteraction, SlashCommandBuilder } from "discord.js";
import { UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import DutyTypesSubcommandGroup from "./Duty Types/Main.js";
import AutocompleteShiftType from "@Utilities/Autocompletion/ShiftType.js";
import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";

const ManagementAuthorizedCmds = ["types", "wipe-all", "admin"];
const Subcommands = [
  (await import("./Subcmds/Admin.js")).default,
  (await import("./Subcmds/Manage.js")).default,
  (await import("./Subcmds/Active.js")).default,
  (await import("./Subcmds/WipeAll.js")).default,
  (await import("./Subcmds/Leaderboard.js")).default,
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Authorize a management slash command usage; returns `true` is it is authorized or `false` otherwise.
 * All commands except management ones are usable by staff identified members.
 * @param Interaction
 */
async function IsAuthorizedCmdUsage(Interaction: SlashCommandInteraction<"cached">) {
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
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
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
 * @param Interaction
 * @return
 */
async function Autocomplete(Interaction: AutocompleteInteraction<"cached">) {
  const { name, value } = Interaction.options.getFocused(true);
  const SubcommandGroup = Interaction.options.getSubcommandGroup();
  const SubcommandName = Interaction.options.getSubcommand();
  const Suggestions =
    name === "type" ||
    (name === "name" &&
      SubcommandGroup === "types" &&
      SubcommandName === "delete" &&
      (await UserHasPerms(Interaction, { management: true })))
      ? await AutocompleteShiftType(value, Interaction.guildId, SubcommandName !== "delete")
      : [{ name: "[Unauthorized]", value: "0" }];

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  options: { cooldown: 5 },
  data: new SlashCommandBuilder()
    .setName("duty")
    .setDescription("Duty related actions.")
    .addSubcommandGroup(DutyTypesSubcommandGroup.data)
    .setDMPermission(false),

  callback: Callback,
  autocomplete: Autocomplete,
};

for (const SubCommand of Subcommands) {
  CommandObject.data.addSubcommand(SubCommand.data);
}

// ---------------------------------------------------------------------------------------
export default CommandObject;
