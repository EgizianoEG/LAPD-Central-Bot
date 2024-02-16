// Dependencies:
// -------------

import AutocompleteMemRolesSave from "@Utilities/Autocompletion/MemRolesSave.js";
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AutocompleteInteraction,
  ApplicationCommandOptionChoiceData,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

const Subcommands = [
  (await import("./Subcmds/Backup.js")).default,
  (await import("./Subcmds/Delete.js")).default,
  (await import("./Subcmds/View.js")).default,
  (await import("./Subcmds/Load.js")).default,
  (await import("./Subcmds/List.js")).default,
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  for (const Subcommand of Subcommands) {
    if (Subcommand.data.name === Interaction.options.getSubcommand()) {
      if (typeof Subcommand.callback === "function") {
        return Subcommand.callback(Interaction);
      } else {
        break;
      }
    }
  }
}

async function Autocomplete(Interaction: AutocompleteInteraction<"cached">) {
  const { name, value } = Interaction.options.getFocused(true);
  const TargetMember = Interaction.options.get("member", false);
  let Suggestions: ApplicationCommandOptionChoiceData[] = [];

  if (name === "save" || name === "backup") {
    if (!TargetMember?.value) Suggestions = [];
    else
      Suggestions = await AutocompleteMemRolesSave(
        TargetMember.value as string,
        Interaction.guildId,
        value
      );
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  options: {
    cooldown: 8,
    bot_perms: { load: [PermissionFlagsBits.ManageRoles] },
    user_perms: { $all_other: { management: true }, load: [PermissionFlagsBits.Administrator] },
  },

  data: new SlashCommandBuilder()
    .setName("member-roles")
    .setDescription("Utility commands for managing member roles.")
    .setDMPermission(false),

  callback: Callback,
  autocomplete: Autocomplete,
};

for (const Subcmd of Subcommands) {
  CommandObject.data.addSubcommand(Subcmd.data);
}

// ---------------------------------------------------------------------------------------
export default CommandObject;
