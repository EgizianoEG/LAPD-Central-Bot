import { BaseInteraction } from "discord.js";
import Chalk from "chalk";

/**
 * Handles autocompletion for command options
 * @param Client
 * @param Interaction
 */
export default (Client: DiscordClient, Interaction: BaseInteraction) => {
  if (!Interaction.isAutocomplete()) return;
  const CommandName = Interaction.commandName;
  const CommandObj = Client.commands.get(CommandName);

  if (!CommandObj) {
    return console.log(
      "%s:%s - No command matching '%s' was found. Autocompletion failed.",
      Chalk.yellow("InteractionCreate"),
      Chalk.red("AutoComplete"),
      Chalk.bold(Interaction.commandName)
    );
  }

  try {
    if (typeof CommandObj.autocomplete === "function") {
      CommandObj.autocomplete(Interaction);
    } else {
      throw new Error(
        `Autocomplete failed for command "${CommandName}" as there is no autocomplete function found for it.`
      );
    }
  } catch (Err) {
    console.log(
      "%s:%s - Something went wrong while autocomplete command '%s'. Details:\n",
      Chalk.yellow("InteractionCreate"),
      Chalk.red("AutoComplete"),
      Chalk.bold(Interaction.commandName),
      Err
    );
  }
};
