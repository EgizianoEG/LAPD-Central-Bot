import { BaseInteraction } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

export default async function AutocompletionHandler(
  Client: DiscordClient,
  Interaction: BaseInteraction
) {
  if (!Interaction.isAutocomplete()) return;
  const CommandName = Interaction.commandName;
  const CommandObj = Client.commands.get(CommandName);
  const FieldName = Interaction.options.getFocused(true).name;
  const FullCmdName = [
    CommandName,
    Interaction.options.getSubcommandGroup(false),
    Interaction.options.getSubcommand(false),
  ]
    .filter(Boolean)
    .join(" ");

  if (!CommandObj) {
    return AppLogger.warn({
      message:
        "No registered command matching '%s' was found. Autocompletion failed for '%s' field.",
      label: "InteractionCreate:AutoComplete",
      splat: [FullCmdName, FieldName],
    });
  }

  try {
    if (typeof CommandObj.autocomplete === "function") {
      await CommandObj.autocomplete(Interaction);
    } else {
      throw new Error(
        `Autocompletion failed for command '${FullCmdName}', field '${FieldName}'. No function for autocompletion was found on the command object.`
      );
    }
  } catch (Err: any) {
    AppLogger.error({
      label: "Events:InteractionCreate:AutoComplete",
      stack: Err.stack,
      message: Err.message,
      details: { ...Err },
    });
  }
}
