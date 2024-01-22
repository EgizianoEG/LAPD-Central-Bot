import { Discord } from "@Config/Secrets.js";

/**
 * ---
 * @param Client
 */
export default async function VerifyGuilds(Client: DiscordClient) {
  if (!Discord.WLGuilds) return;
  for (const JoinedGuild of Client.guilds.cache.values()) {
    if (!Discord.WLGuilds.includes(JoinedGuild.id) && JoinedGuild.id !== Discord.TestGuildId) {
      await JoinedGuild.leave();
    }
  }
}
