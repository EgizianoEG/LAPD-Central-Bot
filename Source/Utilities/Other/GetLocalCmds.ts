import { IsValidCmdObject } from "./Validator.js";
import GetFiles from "./GetFilesFrom.js";
import Path from "path";

/**
 * Collects all the local commands and returns them as an array of command objects
 * @param Exceptions - The names of commands and exceptions which to ignore when collecting local commands
 * @returns An array of command objects
 */
export default async (
  Exceptions: string[] = []
): Promise<SlashCommandObject<DiscordJS.SlashCommandBuilder>[]> => {
  const LocalCommands: SlashCommandObject[] = [];
  const CommandCats = GetFiles(Path.join(__dirname, "..", "..", "Commands"), true);

  for (const CommandCat of CommandCats) {
    const Commands = GetFiles(CommandCat);
    const CommandGroups = GetFiles(CommandCat, true);

    for (const CommandGroup of CommandGroups) {
      const CmdGroupName = Path.basename(CommandGroup);
      const Commands = GetFiles(CommandGroup);

      for (const Command of Commands) {
        if (new RegExp(`(?:${CmdGroupName}|Main).js$`).exec(Command)) {
          const CommandObj = (await import(Command)) as SlashCommandObject;
          if (IsValidCmdObject(CommandObj, Exceptions)) {
            LocalCommands.push(CommandObj);
          }
          break;
        }
      }
    }

    for (const Command of Commands) {
      const CommandObj = (await import(Command)) as SlashCommandObject;
      if (IsValidCmdObject(CommandObj, Exceptions)) {
        LocalCommands.push(CommandObj);
      }
    }
  }

  return LocalCommands;
};
