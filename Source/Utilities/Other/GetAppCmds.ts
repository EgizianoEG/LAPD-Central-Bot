import type {
  Snowflake,
  GuildResolvable,
  ApplicationCommandManager,
  GuildApplicationCommandManager,
} from "discord.js";

/**
 * @param Client - The discord.js client
 * @param GuildId - If provided, returns the application commands registered on it; otherwise, returns global registered slash commands
 * @returns
 */
export default async function <Options extends Snowflake | GuildResolvable | undefined = undefined>(
  Client: DiscordClient,
  GuildId?: Options
): Promise<Options extends string ? GuildApplicationCommandManager : ApplicationCommandManager> {
  if (typeof GuildId === "string") {
    const Guild = await Client.guilds.fetch(GuildId);
    await Guild.commands.fetch();
    return Guild.commands as any;
  } else {
    await Client.application.commands.fetch();
    return Client.application.commands as any;
  }
}
