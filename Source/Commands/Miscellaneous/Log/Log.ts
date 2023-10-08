import { SlashCommandBuilder } from "discord.js";
import AutocompleteHeight from "@Utilities/Autocompletion/Height.js";
import AutocompleteUsername from "@Utilities/Autocompletion/Username.js";
import AutocompleteWeight from "@Utilities/Autocompletion/Weight.js";
import AutocompleteVehicle from "@Utilities/Autocompletion/Vehicle.js";
import AutocompleteColor from "@Utilities/Autocompletion/Color.js";

const Subcommands = [
  (await import("./Deps/CitFine.js")).default,
  (await import("./Deps/CitWarn.js")).default,
  (await import("./Deps/Arrest.js")).default,
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  for (const SubCommand of Subcommands) {
    if (SubCommand.data.name === Interaction.options.getSubcommand()) {
      if (typeof SubCommand.callback === "function") {
        return SubCommand.callback(Client, Interaction);
      } else {
        break;
      }
    }
  }
}

/**
 * @param Interaction
 * @returns
 */
async function Autocomplete(Interaction: DiscordJS.AutocompleteInteraction): Promise<void> {
  const { name, value } = Interaction.options.getFocused(true);
  let Suggestions: { name: string; value: string }[] = [];

  if (name === "name") {
    Suggestions = await AutocompleteUsername(value);
  } else if (name === "height") {
    Suggestions = AutocompleteHeight(value);
  } else if (name === "weight") {
    Suggestions = AutocompleteWeight(value);
  } else if (name === "color" || name === "vehicle-color") {
    Suggestions = AutocompleteColor(value);
  } else if (name === "vehicle" || name === "vehicle-model") {
    Suggestions = AutocompleteVehicle(value);
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<any> = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Logs a particular information into the database.")
    .setDMPermission(false)
    .addSubcommand(Subcommands[0].data)
    .addSubcommand(Subcommands[1].data)
    .addSubcommand(Subcommands[2].data),

  callback: Callback,
  autocomplete: Autocomplete,
  options: { forceUpdate: false },
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
