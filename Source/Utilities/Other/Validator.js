const { SlashCommandBuilder } = require("discord.js");

/**
 * Checks wether a given string can be valid as a Roblox username
 * @param {String} Str
 * @return {Boolean}
 */
function IsValidRobloxUsername(Str) {
  return !!Str.match(/^(?=^[^_\n]+_?[^_\n]+$)\w{3,20}$/);
}

/**
 * Checks wether a given string can be a valid shift type name
 * @param {String} Str
 * @return {Boolean}
 */
function IsValidShiftTypeName(Str) {
  return !!Str.match(/^[\w\-. ]{3,20}$/);
}

/**
 * Validates a given Command Object
 * Used for retrieving local commands (GetLocalCmds)
 * @param {SlashCommandObject} CmdObject
 * @param {Array<String>} [Exceptions=[]]
 * @returns {Boolean} - `true` if the command object is valid; `false` otherwise.
 */
function IsValidCmdObject(CmdObject, Exceptions = []) {
  return !!(
    CmdObject.data instanceof SlashCommandBuilder &&
    CmdObject.data.name &&
    CmdObject.data.description &&
    !Exceptions.includes(CmdObject.data?.name)
  );
}

/**
 * Checks if a given value is an object (excluding arrays and null)
 * @template Any
 * @param {Any} Value
 * @returns {Val is Object}
 */
function IsPlainObject(Value) {
  return !!Value && Value.constructor === Object;
}

/**
 * Checks if a given object is empty and has no properties in it
 * @template Val
 * @param {Val} Obj
 * @returns {Val is {}}
 */
function IsEmptyObject(Obj) {
  for (const Prop in Obj) {
    if (Prop || !Prop) return false;
  }
  return true;
}

module.exports = {
  IsValidRobloxUsername,
  IsValidShiftTypeName,
  IsValidCmdObject,
  IsPlainObject,
  IsEmptyObject,
};
