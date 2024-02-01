import { FormatHeight } from "@Utilities/Strings/Formatters.js";
import { SlashCommandBuilder } from "discord.js";

/**
 * Checks wether a given string can be valid as a Roblox username.
 * @see {@link https://stackoverflow.com/q/54391861 Stack Overflow Reference}
 * @param Str
 * @returns
 */
export function IsValidRobloxUsername(Str: string): boolean {
  return !!(!Str.startsWith("_") && !Str.endsWith("_") && Str.match(/^\w{3,20}$/i));
}

/**
 * Checks wether a given string can be a valid shift type name.
 * Valid names consist of letters, numerals, spaces, underscores, dashes, and periods
 * with a minimum length of `3` characters and a maximum length of `20` characters.
 * @param Str
 * @returns
 */
export function IsValidShiftTypeName(Str: string): boolean {
  return !!(Str.trim().match(/^[\w\-. ]{3,20}$/) && !Str.trim().match(/^[-.]+$/));
}

/**
 * Checks if a given string is a valid license plate by ensuring it does not start or end with
 * a hyphen and consists of 3 to 7 characters that are either letters, digits, or one hyphen between.
 * @param {string} Str - A string that represents a license plate.
 * @returns
 */
export function IsValidLicensePlate(Str: string): boolean {
  return !!(!Str.startsWith("-") && !Str.endsWith("-") && Str.match(/^[A-Z\d-]{3,7}$/i));
}

/**
 * Checks if a given string represents a valid height in feet and inches format (5'11") after also using `FormatHeight` function.
 * @param {string} Str - A string that represents a person's height in feet and inches.
 * @returns
 */
export function IsValidPersonHeight(Str: string): boolean {
  return !!FormatHeight(Str).match(/^[1-7]'(?:\d|1[01]?)"$/);
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
    CmdObject?.data instanceof SlashCommandBuilder &&
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
