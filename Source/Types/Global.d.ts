declare interface SlashCommandObject {
  /** The callback function or the `run` function which will be executed on command call */
  callback: (arg0: DiscordClient, arg1: SlashCommandInteraction<Cached | undefined>) => any;

  /** The autocomplete function which will handle and process autocomplete interactions if applicable */
  autocomplete?: (arg0: AutocompleteInteraction<Cached | undefined>) => any;

  /** The slash command itself */
  data: SlashCommandBuilder;

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
    userPerms?: DiscordPermissionResolvable[];

    /** Bot permissions that are required to run this command */
    botPerms?: DiscordPermissionResolvable[];
  };
}

type DiscordPermissionResolvable = import("discord.js").PermissionResolvable[];
type DiscordCacheType = import("discord.js").CacheType;

declare type SlashCommandInteraction<Cached extends DiscordCacheType = DiscordCacheType> =
  import("discord.js").ChatInputCommandInteraction<Cached>;

declare type DiscordClient = import("discord.js").Client<true>;

type MessageReplyOptions =
  | string
  | import("discord.js").MessagePayload
  | import("discord.js").InteractionReplyOptions;

type RepliableInteraction =
  | import("discord.js").ChatInputCommandInteraction
  | ((class | object) & {
      replied: boolean;
      followUp(options: MessageReplyOptions): any;
    })
  | ((class | object) & {
      replied: boolean;
      reply(options: MessageReplyOptions): any;
    });
