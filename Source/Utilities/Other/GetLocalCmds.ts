import { SlashCommandBuilder } from "discord.js";
import { IsValidCmdObject } from "./Validator.js";
import { GetDirName } from "./Paths.js";
import GetFiles from "./GetFilesFrom.js";
import Path from "node:path";

/**
 * Collects all the local commands and returns them as an array of command objects
 * @param Exceptions - The names of commands and exceptions which to ignore when collecting local commands
 * @returns An array of command objects
 */
export default async (
  Exceptions: string[] = []
): Promise<SlashCommandObject<SlashCommandBuilder>[]> => {
  const LocalCommands: SlashCommandObject[] = [];
  const CommandCats = GetFiles(
    Path.join(GetDirName(import.meta.url), "..", "..", "Commands"),
    true
  );

  for (const CommandCat of CommandCats) {
    const Commands = GetFiles(CommandCat);
    const CommandGroups = GetFiles(CommandCat, true);

    for (const CommandGroup of CommandGroups) {
      const CmdGroupName = Path.basename(CommandGroup);
      const CommandPaths = GetFiles(CommandGroup);

      for (const CommandPath of CommandPaths) {
        if (new RegExp(`(?:${CmdGroupName}|Main).[jt]s$`).exec(CommandPath)) {
          const CommandObj = (await import(CommandPath)).default as SlashCommandObject;
          if (IsValidCmdObject(CommandObj, Exceptions)) {
            LocalCommands.push(CommandObj);
          }
          break;
        }
      }
    }

    for (const Command of Commands) {
      const CommandObj = (await import(Command)).default as SlashCommandObject;
      if (IsValidCmdObject(CommandObj, Exceptions)) {
        LocalCommands.push(CommandObj);
      }
    }
  }

  return LocalCommands;
};
