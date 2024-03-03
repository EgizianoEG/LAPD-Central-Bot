import { AutocompleteInteraction, SlashCommandBuilder } from "discord.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import DutyTypesSubcommandGroup from "./Duty Types/Main.js";
import AutocompleteShiftType from "@Utilities/Autocompletion/ShiftType.js";
import HasRobloxLinked from "@Utilities/Database/IsUserLoggedIn.js";
import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";

const Subcommands = [
  (await import("./Subcmds/Void.js")).default,
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
 * Users may not utilize the `duty manage` subcommand if they have no linked Roblox account.
 * @param Interaction
 */
async function IsAuthorizedCmdUsage(Interaction: SlashCommandInteraction<"cached">) {
  const SubcmdName = Interaction.options.getSubcommand();

  if (SubcmdName === "manage") {
    const LinkedRobloxUser = await HasRobloxLinked(Interaction);
    if (!LinkedRobloxUser) {
      await new ErrorEmbed()
        .useErrTemplate("SMRobloxUserNotLinked")
        .replyToInteract(Interaction, true);
      return false;
    }
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
        return SubCommand.callback.length > 1
          ? (SubCommand.callback as AnySlashCmdCallback)(Client, Interaction)
          : (SubCommand.callback as AnySlashCmdCallback)(Interaction);
      } else {
        continue;
      }
    }
  }

  if (SubCommandGroupName === "types" && typeof DutyTypesSubcommandGroup.callback === "function") {
    return DutyTypesSubcommandGroup.callback.length > 1
      ? (DutyTypesSubcommandGroup.callback as AnySlashCmdCallback)(Client, Interaction)
      : (DutyTypesSubcommandGroup.callback as AnySlashCmdCallback)(Interaction);
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
  callback: Callback,
  autocomplete: Autocomplete,
  options: {
    cooldown: 2.5,
    user_perms: {
      types: { management: true },
      admin: { management: true },
      $all_other: { staff: true },
      "wipe-all": { management: true },
    },
  },

  data: new SlashCommandBuilder()
    .setName("duty")
    .setDescription("Duty and shifts related actions.")
    .addSubcommandGroup(DutyTypesSubcommandGroup.data)
    .setDMPermission(false),
};

for (const SubCommand of Subcommands) {
  CommandObject.data.addSubcommand(SubCommand.data);
}

// ---------------------------------------------------------------------------------------
export default CommandObject;
