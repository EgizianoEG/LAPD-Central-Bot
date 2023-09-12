const Path = require("path");
const GetFiles = require("./GetFiles");
const { IsValidCmdObject } = require("./Validator");
// ----------------------------------------------------------------

/**
 * Collects all the local commands and returns them as an array of command objects
 * @param {Array<String>} [Exceptions=[]] The names of commands and exceptions which to ignore when collecting local commands
 * @returns {Array<SlashCommandObject>} An array of command objects
 */
module.exports = (Exceptions = []) => {
  const LocalCommands = [];
  const CommandCats = GetFiles(Path.join(__dirname, "..", "..", "Commands"), true);

  for (const CommandCat of CommandCats) {
    const Commands = GetFiles(CommandCat);
    const CommandGroups = GetFiles(CommandCat, true);

    for (const CommandGroup of CommandGroups) {
      const CmdGroupName = Path.basename(CommandGroup);
      const Commands = GetFiles(CommandGroup);

      for (const Command of Commands) {
        if (Command.match(new RegExp(`(?:${CmdGroupName}|Main).js$`))) {
          const CommandObj = require(Command);
          if (IsValidCmdObject(CommandObj, Exceptions)) {
            LocalCommands.push(CommandObj);
          }
          break;
        }
      }
    }

    for (const Command of Commands) {
      const CommandObj = require(Command);
      if (IsValidCmdObject(CommandObj, Exceptions)) {
        LocalCommands.push(CommandObj);
      }
    }
  }

  return LocalCommands;
};
