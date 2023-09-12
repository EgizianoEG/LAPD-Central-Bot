import type { Snowflake, FetchGuildOptions } from "discord.js";

declare global {
  namespace Utilities {
    declare interface ErrorReplyOptions {
      /** The repliable interaction */
      Interaction: RepliableInteraction;

      /** Whether this reply is ephemeral or publicly visible */
      Ephemeral?: boolean;

      /** The title of the error reply; defaults to "Error" */
      Title?: string;

      /** The description of the error reply */
      Message?: string;

      /** A pre-defined template with title and description to use instead of providing `Title` and `Description` options. `Ephemeral` option is still respected. */
      Template?: "AppError";
    }

    type GetAppCommands = <Scope extends Snowflake | FetchGuildOptions | undefined = undefined>(
      /** The discord.js client */
      Client: DiscordClient,

      /** If provided, returns the application commands registered on it; otherwise, returns global registered slash commadns */
      GuildId?: Scope
    ) => Promise<
      Scope extends string
        ? DiscordJS.GuildApplicationCommandManager
        : DiscordJS.ApplicationCommandManager
    >;
  }
}
