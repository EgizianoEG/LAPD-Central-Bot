import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  SlashCommandSubcommandsOnlyBuilder,
  ApplicationIntegrationType,
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
    cooldown: { search: 2.5, replace: 8 },
    bot_perms: { replace: [PermissionFlagsBits.ManageNicknames] },
    user_perms: { replace: [PermissionFlagsBits.Administrator], $all_other: { staff: true } },
  },

  data: new SlashCommandBuilder()
    .setName("nicknames")
    .setDescription("Utility commands for member nicknames.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand(Subcommands[0].data)
    .addSubcommand(Subcommands[1].data),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
