import * as DiscordJSMask from "discord.js";
import type {
  ApplicationCommandManager,
  GuildApplicationCommandManager,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  AutocompleteInteraction,
  PermissionResolvable,
  SlashCommandBuilder,
  MessagePayload,
  CacheType,
  Client,
} from "discord.js";

type CommandObjectDataType =
  | SlashCommandBuilder
  | SlashCommandSubcommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | undefined
  | any;

declare global {
  export import DiscordJS = DiscordJSMask;

  type MessageReplyOptions = string | MessagePayload | InteractionReplyOptions;
  type RepliableInteraction =
    | ChatInputCommandInteraction
    | ((class | object) & {
        replied: boolean;
        followUp(options: MessageReplyOptions): any;
      })
    | ((class | object) & {
        replied: boolean;
        reply(options: MessageReplyOptions): any;
      });

  type DiscordClient = Client<true>;
  type SlashCommandInteraction<Cached extends CacheType = CacheType> =
    ChatInputCommandInteraction<Cached>;

  interface SlashCommandObject<DataType extends CommandObjectDataType = SlashCommandBuilder> {
    /** The callback function or the `run` function which will be executed on command call */
    callback: (arg0: DiscordClient, arg1: SlashCommandInteraction<Cached | undefined>) => any;

    /** The autocomplete function which will handle and process autocomplete interactions if applicable */
    autocomplete?: (arg0: AutocompleteInteraction<Cached | undefined>) => any;

    /** The slash command itself */
    data: DataType;

    /** Optional configurations */
    options?: {
      /** Whether or not this command will be removed if it already exists in the application or excluded from registration. */
      deleted?: boolean;

      /** Should the command be updated regardless of whether it is altered or not? */
      forceUpdate?: boolean;

      /**Should command execution be restricted to application developers only? */
      devOnly?: boolean;

      /** Cooldown period in *seconds* between each command execution (Check the `CommandHandler` file for the default cooldown value) */
      cooldown?: number;

      /** The required user permissions to run such a command */
      userPerms?: PermissionResolvable[];

      /** Bot permissions that are required to run this command */
      botPerms?: PermissionResolvable[];
    };
  }
}
