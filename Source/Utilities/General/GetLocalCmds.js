// eslint-disable-next-line no-unused-vars
const { SlashCommandBuilder } = require("discord.js");
const GetFiles = require("./GetFiles");
const Path = require("path");
// ----------------------------------------------------------------

/**
 * Collects all the local commands and returns them as an array of command objects
 * @param {Array.<String>} [Exceptions=[]] The names of commands and exceptions which to ignore when collecting local commands
 * @returns {Array.<CommandObject>} An array of command objects
 */
module.exports = (Exceptions = []) => {
  const LocalCommands = [];
  const CommandCats = GetFiles(Path.join(__dirname, "..", "..", "Commands"), true);

  for (const CommandCat of CommandCats) {
    const Commands = GetFiles(CommandCat);
    const CommandGroups = GetFiles(CommandCat, true);

    for (const CommandGroup of CommandGroups) {
      const CommandName = CommandGroup.match(/.+\\(.+)$/i)[1];
      const Commands = GetFiles(CommandGroup);

      for (const Command of Commands) {
        if (Command.match(new RegExp(`(?:${CommandName}|Main).js$`))) {
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

// ----------------------------------------------------------------
// Types:
// ------
/**
 * @typedef {Object} CommandObject
 * @property {SlashCommandBuilder} data - The data for the command
 * @property {boolean?} deleted - Indicates if the command should be deleted
 * @property {boolean?} forceUpdate - Indicates if the command needs to be forcefully updated
 * @property {boolean?} devOnly - Indicates if the command is restricted to developers only
 * @property {number?} cooldown - The cooldown duration for the command
 * @property {Array.<BigInt>?} userPerms - The required user permissions to execute the command
 * @property {Array.<BigInt>?} botPerms - The required bot permissions to execute the command
 * @property {function?} callback - The callback function for executing the command
 * @property {function?} autocomplete - The autocomplete function for providing command option suggestions
 */
