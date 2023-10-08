import { SlashCommandSubcommandGroupBuilder } from "discord.js";

const Subcommands = [
  (await import("./Subcmds/View.js")).default,
  (await import("./Subcmds/View.js")).default,
  (await import("./Subcmds/Create.js")).default,
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const SubcommandName = Interaction.options.getSubcommand();

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
export default SubcommandGroupObject;
