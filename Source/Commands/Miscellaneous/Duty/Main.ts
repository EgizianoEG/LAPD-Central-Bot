import { IsValidShiftTypeName } from "@Utilities/Other/Validators.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  SlashCommandBuilder,
  InteractionContextType,
  AutocompleteInteraction,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

import DutyTypesSubcommandGroup from "./Duty Types/Main.js";
import AutocompleteShiftType from "@Utilities/Autocompletion/ShiftType.js";
import HasRobloxLinked from "@Utilities/Database/IsUserLoggedIn.js";
import IsModuleEnabled from "@Utilities/Database/IsModuleEnabled.js";
import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";
import ShiftTypeExists from "@Utilities/Database/ShiftTypeExists.js";

const Subcommands = [
  (await import("./Subcmds/Void.js")).default,
  (await import("./Subcmds/Admin.js")).default,
  (await import("./Subcmds/Manage.js")).default,
  (await import("./Subcmds/Active.js")).default,
  (await import("./Subcmds/EndAll.js")).default,
  (await import("./Subcmds/Leaderboard.js")).default,
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param ShiftTypeName - The provided shift type name from the user.
 * @param Interaction - The user command interaction.
 * @param DBCheck - If `true`, checks the database for the existence of the shift type. Defaults to `false`.
 * @returns If the interaction has been handled and a response has been sent, returns `true`; otherwise returns `false`.
 */
export async function HandleShiftTypeValidation(
  CmdInteraction: SlashCommandInteraction<"cached">,
  ShiftTypeName: string,
  DBCheck: boolean = false
): Promise<boolean> {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedShiftTypeName")
      .replyToInteract(CmdInteraction, true)
      .then(() => true);
  } else if (DBCheck && !(await ShiftTypeExists(ShiftTypeName, CmdInteraction.guildId))) {
    return new ErrorEmbed()
      .useErrTemplate("NonexistentShiftTypeUsage")
      .replyToInteract(CmdInteraction, true)
      .then(() => true);
  }

  return false;
}

/**
 * Authorize a management slash command usage; returns `true` is it is authorized or `false` otherwise.
 * Users may not utilize the `duty manage` subcommand if they have no linked Roblox account.
 * @param Interaction
 */
async function IsAuthorizedCmdUsage(Interaction: SlashCommandInteraction<"cached">) {
  const SubcmdName = Interaction.options.getSubcommand();
  const ModuleEnabled = await IsModuleEnabled(Interaction.guildId, "shift_management");

  if (ModuleEnabled === false) {
    return new ErrorEmbed()
      .useErrTemplate("ShiftManagementModuleDisabled")
      .replyToInteract(Interaction, true)
      .then(() => false);
  }

  if (SubcmdName === "manage") {
    const LinkedRobloxUser = await HasRobloxLinked(Interaction);
    if (!LinkedRobloxUser) {
      return new ErrorEmbed()
        .useErrTemplate("SMRobloxUserNotLinked")
        .replyToInteract(Interaction, true)
        .then(() => false);
    }
  }

  return true;
}

/**
 * @param Client
 * @param Interaction
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const SubCommandName = Interaction.options.getSubcommand();
  const SubCommandGroupName = Interaction.options.getSubcommandGroup();

  if (!(await IsAuthorizedCmdUsage(Interaction))) return;
  for (const SubCommand of Subcommands) {
    if (SubCommand.data.name === SubCommandName && typeof SubCommand.callback === "function") {
      return (SubCommand.callback as AnySlashCmdCallback)(Interaction);
    }
  }

  if (SubCommandGroupName === "types" && typeof DutyTypesSubcommandGroup.callback === "function") {
    return (DutyTypesSubcommandGroup.callback as AnySlashCmdCallback)(Interaction);
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
    ["type", "shift-type"].includes(name) ||
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
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  callback: Callback,
  autocomplete: Autocomplete,
  options: {
    cooldown: 2.5,
    user_perms: {
      types: { management: true },
      admin: { management: true },
      $all_other: { staff: true },
      "end-all": { management: true },
    },
  },

  data: new SlashCommandBuilder()
    .setName("duty")
    .setDescription("Duty and shifts related actions.")
    .addSubcommandGroup(DutyTypesSubcommandGroup.data)
    .setContexts(InteractionContextType.Guild),
};

for (const SubCommand of Subcommands) {
  CommandObject.data.addSubcommand(SubCommand.data);
}

// ---------------------------------------------------------------------------------------
export default CommandObject;
