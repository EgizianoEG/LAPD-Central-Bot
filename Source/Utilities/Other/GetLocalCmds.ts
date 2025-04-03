import { IsValidCmdObject } from "./Validators.js";
import { GetDirName } from "./Paths.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetFiles from "./GetFilesFrom.js";
import Path from "node:path";
const FileLabel = "Utilities:Other:GetLocalCommands";

/**
 * Collects all the local commands and returns them as an array of command objects
 * @param Exceptions - The names of commands and exceptions which to ignore when collecting local commands
 * @returns An array of command objects
 */
export default async function GetLocalCommands(
  Exceptions: string[] = []
): Promise<Array<SlashCommandObject | ContextMenuCommandObject>> {
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
          try {
            const CommandObj = (await ImportWithTimeout(CommandPath)).default;
            if (IsValidCmdObject(CommandObj, Exceptions)) {
              LocalCommands.push(CommandObj);
            }
          } catch (Err: unknown) {
            if (Err instanceof Error) {
              AppLogger.debug({
                message: "Failed to import main command file; Skipping...",
                stack: Err.stack,
                label: FileLabel,
              });
            }
          }
          break;
        }
      }
    }

    for (const Command of Commands) {
      try {
        const CommandObj = (await ImportWithTimeout(Command)).default;
        if (IsValidCmdObject(CommandObj, Exceptions)) {
          LocalCommands.push(CommandObj);
        }
      } catch (Err: unknown) {
        if (Err instanceof Error) {
          AppLogger.debug({
            message: "Failed to import main command file; Skipping...",
            stack: Err.stack,
            label: FileLabel,
          });
        }
      }
    }
  }

  return LocalCommands;
}

async function ImportWithTimeout(CommandPath: string, TimeoutMs: number = 5000) {
  return Promise.race([
    import(CommandPath),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `(Timed Out) Failed to import ${CommandPath} within ${TimeoutMs}ms. Check for circular Imports, correct file paths, or infinite loops.`
            )
          ),
        TimeoutMs
      )
    ),
  ]);
}
