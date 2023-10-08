import { SlashCommandBuilder } from "discord.js";

/**
 * Checks wether a given string can be valid as a Roblox username
 */
export function IsValidRobloxUsername(Str: string): boolean {
  return !!Str.match(/^(?=^[^_\n]+_?[^_\n]+$)\w{3,20}$/);
}

/**
 * Checks wether a given string can be a valid shift type name
 */
export function IsValidShiftTypeName(Str: string): boolean {
  return !!Str.match(/^[\w\-. ]{3,20}$/);
}

/**
 * Validates a given Command Object
 * Used for retrieving local commands (GetLocalCmds)
 * @returns `true` if the command object is valid; `false` otherwise.
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
 * Checks if a given value is a plain object (excluding arrays and null)
 */
export function IsPlainObject(Value: any): boolean {
  return !!Value && Value.constructor === Object;
}

/**
 * Checks if a given object is empty and has no properties in it
 */
export function IsEmptyObject(Obj: any): boolean {
  for (const Prop in Obj) {
    if (Prop || !Prop) return false;
  }
  return true;
}
