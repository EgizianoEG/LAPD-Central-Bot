// Dependencies:
// -------------

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

const Subcommands = [
  (await import("./Subcmds/Search.js")).default,
  (await import("./Subcmds/Replace.js")).default,
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

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  options: {
    cooldown: 2.5,
    bot_perms: { replace: [PermissionFlagsBits.ManageNicknames] },
    user_perms: { replace: [PermissionFlagsBits.Administrator], $all_other: { staff: true } },
  },

  data: new SlashCommandBuilder()
    .setName("nicknames")
    .setDescription("Utility commands for member nicknames.")
    .setDMPermission(false)
    .addSubcommand(Subcommands[0].data)
    .addSubcommand(Subcommands[1].data),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
