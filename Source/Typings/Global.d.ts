import type * as DiscordJSMask from "discord.js";
import type * as MongooseMask from "mongoose";
import type * as UtilityTypesMask from "utility-types";
import type { ScheduleOptions } from "node-cron";
import type { GeneralTypings } from "./Utilities/Generic.d.ts";
import type {
  MessageContextMenuCommandInteraction,
  SlashCommandSubcommandsOnlyBuilder,
  UserContextMenuCommandInteraction,
  SlashCommandSubcommandBuilder,
  ContextMenuCommandInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
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
  | undefined;

export type ContextMenuCmdInteractionType =
  | ContextMenuCommandInteraction<Cached | undefined>
  | UserContextMenuCommandInteraction<Cached | undefined>
  | MessageContextMenuCommandInteraction<Cached | undefined>;

/**
 * @note Each cron job will be automatically started even if not specified in cron options.
 **/
export interface CronJobFileDefReturn {
  cron_exp: string;

  /**
   * The function to be executed on each scheduled occurrence of the cron job.
   * This property is optional, and if not provided, the con job scheduling will be skipped (not registered and will not be executed at any time).
   *
   * - `arg0?: Date | "manual" | "init"`: The first argument is either a `Date` object representing
   *   the exact time when the cron job was triggered, or a string (`"manual"` or `"init"`) that
   *   indicates if the function was invoked manually or on the initial run after the application
   *   starts.
   *   - `Date`: The actual date and time when the cron job is triggered.
   *   - `"manual"`: Indicates the function was manually triggered outside of the scheduled time.
   *   - `"init"`: Indicates that the cron job was executed upon initialization, usually due to a
   *     configuration setting like `runOnInit`.
   *
   * - `arg1?: DiscordClient`: The second argument is the `DiscordClient` instance, allowing the cron
   *   job to interact with Discord, send messages, update statuses, or perform other operations
   *   within the Discord client.
   *
   * @returns The function can return either a value of any type or a promise that resolves to any value,
   * allowing it to perform asynchronous operations as needed.
   */
  cron_func?: (arg0?: Date | "manual" | "init", arg1?: DiscordClient) => any | Promise<any>;

  cron_opts?: ScheduleOptions & {
    /**
     * Defines how unhandled errors in the cron function should be managed.
     *
     * - `"silent/log"`: The error will be caught and logged using the application's logging system,
     *   but the cron job will continue running as normal.
     *
     * - `"silent/ignore"`: The error will be caught and completely suppressed without any logging.
     *   The cron job will continue running.
     *
     * - `"silent/ignore/end_job"`: The error will be caught and completely suppressed with logging.
     *   The cron job will be stopped afterwards.
     *
     * - `"silent/ignore/end_job"`: The error will be caught and completely suppressed without any logging.
     *   The cron job will be stopped afterwards.
     *
     * - `"throw"`: The error will be thrown as an exception, causing the cron job to stop and potentially
     *   propagating the error up the stack, which could stop the application if unhandled.
     *
     * - `(error: any) => any`: A custom error handling function that receives the error as an argument
     *   and allows you to implement custom logic to manage it. This provides the most flexibility
     *   and control over how errors are handled.
     *
     * - `null` or `undefined`: Equivalent to "throw". The error will be thrown as an exception, adhering to the
     *   strictest error handling mode by default.
     */
    errorHandlingMechanism?:
      | "silent/log"
      | "silent/ignore"
      | "silent/log/end_job"
      | "silent/ignore/end_job"
      | "throw"
      | ((error: any) => any)
      | null;
  };
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

  type PartialAllowNull<T> = {
    [P in keyof T]?: T[P] | null;
  };

  type DeepPartialAllowNull<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartialAllowNull<T[P]> | null : T[P] | null;
  };

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

  type AnyCtxMenuCmdCallback = (
    arg0: DiscordClient | ContextMenuCommandInteraction,
    arg1?: ContextMenuCommandInteraction
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

  interface ContextMenuCommandObject<
    CmdType extends ContextMenuCmdInteractionType = MessageContextMenuCommandInteraction,
  > {
    callback:
      | ((arg0: DiscordClient, arg1: CmdType<Cached | undefined>) => Promise<any>)
      | ((arg0: CmdType<Cached | undefined>) => Promise<any>);

    /** Optional configurations */
    options?: CommandObjectOptions;

    /** The context menu command itself */
    data: ContextMenuCommandBuilder;
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
