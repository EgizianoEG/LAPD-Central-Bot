import { SlashCommandBuilder } from "discord.js";

/**
 * Checks wether a given string can be valid as a Roblox username.
 * @see {@link https://stackoverflow.com/q/54391861 Stack Overflow Reference}
 * @param Str
 * @returns
 */
export function IsValidRobloxUsername(Str: string): boolean {
  return !!Str.match(/^(?=^[^_\n]+_?[^_\n]+$)\w{3,20}$/);
}

/**
 * Checks wether a given string can be a valid shift type name.
 * Valid names consist of letters, numerals, spaces, underscores, dashes, and periods
 * with a minimum length of `3` characters and a maximum length of `20` characters.
 * @param Str
 * @returns
 */
export function IsValidShiftTypeName(Str: string): boolean {
  return !!Str.trim().match(/^[\w\-. ]{3,20}$/);
}

/**
 * Validates a given Command Object.
 * Used for validating retrieved local commands.
 * @param CmdObject
 * @param Exceptions
 * @returns
 */
export function IsValidCmdObject(
  CmdObject: SlashCommandObject,
  Exceptions: Array<string> = []
): boolean {
  return !!(
    CmdObject.data instanceof SlashCommandBuilder &&
    CmdObject.data.name &&
    CmdObject.data.description &&
    !Exceptions.includes(CmdObject.data?.name)
  );
}

/**
 * Checks if a given value is a plain object (excluding arrays and `null`s)
 * @param Value
 * @returns
 */
export function IsPlainObject(Value: any): boolean {
  return !!Value && Value.constructor === Object;
}

/**
 * Checks if a given object is empty and has no properties in it
 * @param Obj
 * @returns
 */
export function IsEmptyObject(Obj: any): boolean {
  for (const Prop in Obj) {
    if (Object.hasOwn(Obj, Prop)) {
      return false;
    }
  }
  return true;
}
