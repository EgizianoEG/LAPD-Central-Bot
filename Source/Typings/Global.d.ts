import type * as DiscordJSMask from "discord.js";
import type * as MongooseMask from "mongoose";
import type * as UtilityTypesMask from "utility-types";
import type { ExtraTypings } from "./Utilities/Database.js";
import type {
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionResolvable,
  SlashCommandBuilder,
  CacheType,
  Client,
} from "discord.js";

export type DiscordClient = Client<true>;
export type RangedArray<T, Min extends number, Max extends number> = TupleMinMax<T, Min, Max>;
export type SlashCommandInteraction<Cached extends CacheType = undefined> =
  ChatInputCommandInteraction<Cached>;
export type CommandObjectDataType =
  | SlashCommandBuilder
  | SlashCommandSubcommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | undefined
  | any;

export interface CommandObjectOptions {
  /** Whether or not this command will be removed if it already exists in the application or excluded from registration. */
  deleted?: boolean;

  /** Should the command be updated regardless of whether it is altered or not? */
  forceUpdate?: boolean;

  /**Should command execution be restricted to application developers only? */
  devOnly?: boolean;

  /** Cooldown period in *seconds* between each command execution (Check the `CommandHandler` file for the default cooldown value) */
  cooldown?: number;

  /** The required user permissions to run this command */
  userPerms?:
    | PermissionResolvable[]
    | UtilityTypesMask.DeepPartial<ExtraTypings.UserPermissionsConfig>;

  /** Bot permissions that are required to run this command */
  botPerms?: PermissionResolvable[];
}

declare global {
  export import DiscordJS = DiscordJSMask;
  export import Mongoose = MongooseMask;
  export import UtilityTypes = UtilityTypesMask;

  type UnPartial<T> = T extends Partial<infer R> ? R : T;
  type NonEmptyArray<T> = [T, ...T[]];
  type RangedArray<T, Min extends number, Max extends number> = TupleMinMax<T, Min, Max>;

  /** Expands a type definition recursively. */
  type ExpandRecursively<T> = T extends (...args: infer A) => infer R
    ? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
    : T extends object
      ? T extends infer O
        ? { [K in keyof O]: ExpandRecursively<O[K]> }
        : never
      : T;

  /** @see {@link https://stackoverflow.com/a/72522221} */
  type TupleMinMax<
    T,
    Min extends number,
    Max extends number,
    A extends (T | undefined)[] = [],
    O extends boolean = false,
  > = O extends false
    ? Min extends A["length"]
      ? TupleMinMax<T, Min, Max, A, true>
      : TupleMinMax<T, Min, Max, [...A, T], false>
    : Max extends A["length"]
      ? A
      : TupleMinMax<T, Min, Max, [...A, T?], false>;

  type DiscordClient = Client<true>;
  type SlashCommandWithOptions = Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  type SlashCommandInteraction<Cached extends CacheType = CacheType> =
    ChatInputCommandInteraction<Cached>;

  interface SlashCommandObject<ClassType extends CommandObjectDataType = SlashCommandBuilder> {
    /** The callback function or the `run` function which will be executed on command call */
    callback: (
      arg0: DiscordClient,
      arg1: SlashCommandInteraction<Cached | undefined>
    ) => Promise<any>;

    /** The autocomplete function which will handle and process autocomplete interactions if applicable */
    autocomplete?: (arg0: AutocompleteInteraction<Cached | undefined>) => Promise<any>;

    /** Optional configurations */
    options?: CommandObjectOptions;

    /** The slash command itself */
    data: ClassType;
  }
}
