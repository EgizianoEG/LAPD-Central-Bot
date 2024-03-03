import type * as DiscordJSMask from "discord.js";
import type * as MongooseMask from "mongoose";
import type * as UtilityTypesMask from "utility-types";
import type { ScheduleOptions } from "node-cron";
import type { GeneralTypings } from "./Utilities/Generic.d.ts";
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

export interface CronJobFileDefReturn {
  cron_exp: string;
  cron_opts?: ScheduleOptions;
  cron_func?: (arg0?: Date | "manual" | "init", arg1?: DiscordClient) => void;
}

declare global {
  export import DiscordJS = DiscordJSMask;
  export import Mongoose = MongooseMask;
  export import UtilityTypes = UtilityTypesMask;

  /**
    * Defines a type that can be either undefined, null, or of type T.
    * @example
      // Expect: `string | undefined | null`
      type NullableString = Nullable<string>;
   */
  type Nullable<T> = undefined | null | T;
  type NonEmptyArray<T> = [T, ...T[]];
  type UnPartial<T> = T extends Partial<infer R> ? R : T;
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

  type AnySlashCmdCallback = (
    arg0: DiscordClient | SlashCommandInteraction,
    arg1?: SlashCommandInteraction
  ) => Promise<any>;

  interface CommandObjectOptions {
    /** Whether or not this command will be removed if it already exists in the application or excluded from registration. */
    deleted?: boolean;

    /** Should the command be updated regardless of whether it is altered or not? */
    force_update?: boolean;

    /**Should command execution be restricted to application developers only? */
    dev_only?: boolean;

    /**
     * Cooldown period in *seconds* between each command execution (Check the `CommandHandler` file for the default cooldown value).
     * Could be a record of cooldowns so that there are different cooldowns for each sub command or sub command group individually.
     * Use "$all_other", "$other_cmds", "$all", or "$other" to set a cooldown for all other commands/subcmds/subcmd-groups under a single slash command.
     *
     * If there is a cooldown set for a subcommand or subcommand group, it will override the default or $all_other cooldown value.
     */
    cooldown?: number | Record<"$all_other" | "$other_cmds" | "$all" | "$other" | string, number>;

    /**
     * The required user guild permissions to run this command.
     * Could be for the whole command [group] or for each sub-command or sub-command group.
     * @example
     * // The following declaration will only allow subcommand "load" to be used by users with the "Administrator"
     * // permission, and will also allow all other subcommands (not "load") to be used by users with the "Management"
     * // permission for either the server or the bot itself since "$all_other" is set.
     *
     * // Notice that specifying cmds with names will have a higher priority than specifying all other command perms.
     * // Also that the "$all_other" has alternative names: "$other_cmds", "$all", and "$other".
     *
     * const Options: CommandObjectOptions = {
     *  ...
     *  user_perms: { $all_other: { management: true }, load: [PermissionFlagsBits.Administrator] }
     *  ...
     *  }
     */
    user_perms?:
      | PermissionResolvable[]
      | UtilityTypesMask.DeepPartial<GeneralTypings.UserPermissionsConfig>
      | Record<
          "$all_other" | "$other_cmds" | "$all" | "$other" | string,
          | UtilityTypesMask.DeepPartial<GeneralTypings.UserPermissionsConfig>
          | PermissionResolvable[]
        >;

    /**
     * Bot guild permissions that are required to run this command.
     * This could also be a record mapped to each sub-command or sub-command group.
     */
    bot_perms?: PermissionResolvable[] | Record<string, PermissionResolvable[]>;
  }

  interface SlashCommandObject<ClassType extends CommandObjectDataType = SlashCommandBuilder> {
    /** The callback function or the `run` function which will be executed on command call */
    callback:
      | ((arg0: DiscordClient, arg1: SlashCommandInteraction<Cached | undefined>) => Promise<any>)
      | ((arg0: SlashCommandInteraction<Cached | undefined>) => Promise<any>);

    /** The autocomplete function which will handle and process autocomplete interactions if applicable */
    autocomplete?: (arg0: AutocompleteInteraction<Cached | undefined>) => Promise<any>;

    /** Optional configurations */
    options?: CommandObjectOptions;

    /** The slash command itself */
    data: ClassType;
  }
}
