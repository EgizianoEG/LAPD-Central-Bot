import type * as DiscordJSMask from "discord.js";
import type * as MongooseMask from "mongoose";
import type * as UtilityTypesMask from "utility-types";
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

/** @see {@link https://stackoverflow.com/a/72522221} */
export type TupleMinMax<
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
  userPerms?: PermissionResolvable[];

  /** Bot permissions that are required to run this command */
  botPerms?: PermissionResolvable[];
}

declare global {
  export import DiscordJS = DiscordJSMask;
  export import Mongoose = MongooseMask;
  export import UtilityTypes = UtilityTypesMask;

  type DiscordClient = Client<true>;
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
