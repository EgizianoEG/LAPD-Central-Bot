const GetFiles = require("./GetFiles");
const Path = require("path");
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
      const MainFileName = CommandGroup.match(/\\?([^\\]+)\.\w+$/i)?.[1];
      const Commands = GetFiles(CommandGroup);

      for (const Command of Commands) {
        if (Command.match(new RegExp(`(?:${MainFileName}|Main).js$`))) {
          const CommandObj = require(Command);
          if (
            CommandObj.data?.name &&
            CommandObj.data?.description &&
            !Exceptions.includes(CommandObj.data?.name)
          ) {
            LocalCommands.push(CommandObj);
          }
          break;
        }
      }
    }

    for (const Command of Commands) {
      const CommandObj = require(Command);
      if (
        CommandObj.data?.name &&
        CommandObj.data?.description &&
        !Exceptions.includes(CommandObj.data?.name)
      ) {
        LocalCommands.push(CommandObj);
      }
    }
  }

  return LocalCommands;
};
