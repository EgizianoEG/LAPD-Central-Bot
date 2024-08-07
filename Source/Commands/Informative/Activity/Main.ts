// Dependencies:
// -------------
import AutocompleteShiftType from "@Utilities/Autocompletion/ShiftType.js";
import {
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ApplicationCommandOptionChoiceData,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

const Subcommands = [
  (await import("./Subcmds/Officer.js")).default,
  (await import("./Subcmds/Report.js")).default,
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const SubCommandName = Interaction.options.getSubcommand();
  for (const Subcommand of Subcommands) {
    if (Subcommand.data.name === SubCommandName) {
      if (typeof Subcommand.callback === "function") {
        return (Subcommand.callback as any)(Interaction);
      } else {
        continue;
      }
    }
  }
}

async function Autocomplete(Interaction: AutocompleteInteraction<"cached">): Promise<void> {
  const { name, value } = Interaction.options.getFocused(true);
  let Suggestions: ApplicationCommandOptionChoiceData[];

  if (name === "shift-type") {
    Suggestions = await AutocompleteShiftType(value, Interaction.guildId);
  } else if (name === "since" && value.match(/^\s*$/)) {
    Suggestions = ["yesterday", "3 days ago", "7 days ago", "14 days ago", "30 days ago"].map(
      (Choice) => ({ name: Choice, value: Choice })
    );
  } else if (name === "time-requirement" && value.match(/^\s*$/)) {
    Suggestions = [
      "30 minutes",
      "1 hour",
      "2 hours",
      "3 hours",
      "4 hours",
      "5 hours",
      "6 hours",
      "7 hours",
      "8 hours",
    ].map((Choice) => ({ name: Choice, value: Choice }));
  } else {
    Suggestions = [];
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  autocomplete: Autocomplete,
  callback: Callback,
  options: {
    cooldown: { report: 10, for: 2.5 },
    user_perms: { report: { management: true }, $all: { staff: true } },
  },

  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Get information about server activity.")
    .setDMPermission(false)
    .addSubcommand(Subcommands[0].data)
    .addSubcommand(Subcommands[1].data),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
