import { Collection, Guild } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
const FileLabel = "Utilities:ResolveDiscordUsernames";

/**
 * Resolves a list of Discord usernames to their corresponding user IDs within a specified guild.
 *
 * This function attempts to map each username in the provided list to a user ID by first performing
 * a bulk fetch of all guild members. If the bulk fetch fails or some usernames remain unresolved,
 * it falls back to individual username searches in batches.
 *
 * @param GuildInstance - The Discord guild instance where the usernames are to be resolved.
 * @param Usernames - An array of Discord usernames to resolve to user IDs.
 * @param MaxTimeMs - The maximum time in milliseconds to spend resolving usernames. Defaults to 5000ms (5 seconds).
 * @returns A promise that resolves to a `Map` where the keys are usernames and the values are user IDs.
 *
 * @throws This function does not throw directly but logs errors internally if member fetching or searching fails as debug logs.
 *         Callers should handle the possibility of unresolved usernames in the returned `Collection`.
 * @remarks
 * - Bulk fetching is attempted first to improve performance.
 * - If bulk fetching fails, usernames are resolved individually in batches of 5 to avoid rate limits.
 *
 * @example
 * ```typescript
 * const GuildInst = Client.guilds.cache.get('guild_id');
 * const Usernames = ['User1', 'User2', 'User3'];
 * const UsernameToIdMap = await ResolveUsernamesToIds(GuildInst, Usernames);
 * console.log(UsernameToIdMap);
 * ```
 */
export default async function ResolveUsernamesToIds(
  GuildInstance: Guild,
  Usernames: string[],
  MaxTimeMs: number = 5_000
): Promise<Collection<string, string>> {
  const UsernameToUserIdMap = new Collection<string, string>();
  const StartTime = Date.now();

  try {
    await GuildInstance.members.fetch({ time: MaxTimeMs });
    GuildInstance.members.cache.forEach((member) => {
      if (Usernames.includes(member.user.username)) {
        UsernameToUserIdMap.set(member.user.username, member.user.id);
      }
    });
  } catch (Err: any) {
    AppLogger.debug({
      message: "Failed to bulk fetch guild members; falling back to individual lookups.",
      guild_id: GuildInstance.id,
      label: FileLabel,
      stack: Err.stack,
    });
  }

  let UnresolvedUsernames: string[] = [];
  if (GuildInstance.members.cache.size > 0) {
    UnresolvedUsernames = Usernames.filter((u) => !UsernameToUserIdMap.has(u));
  } else {
    UnresolvedUsernames = Usernames;
    AppLogger.debug({
      message: "Bulk fetch failed; recalculating unresolved usernames.",
      label: FileLabel,
      guild_id: GuildInstance.id,
    });
  }

  const BatchSize = 5;
  for (let i = 0; i < UnresolvedUsernames.length; i += BatchSize) {
    const ElapsedTime = Date.now() - StartTime;
    if (ElapsedTime >= MaxTimeMs) {
      AppLogger.debug({
        message: "Maximum time exceeded while resolving usernames to user IDs.",
        guild_id: GuildInstance.id,
        label: FileLabel,
      });
      break;
    }

    const CurrentBatch = UnresolvedUsernames.slice(i, i + BatchSize);
    for (const Username of CurrentBatch) {
      try {
        const SearchResult = await GuildInstance.members.search({ query: Username, limit: 1 });
        const Member = SearchResult.first();
        if (Member) UsernameToUserIdMap.set(Username, Member.id);
      } catch (Err: any) {
        AppLogger.debug({
          message: `Failed to resolve username "${Username}" to user ID. Batch #${i / BatchSize}.`,
          guild_id: GuildInstance.id,
          label: FileLabel,
          stack: Err.stack,
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return UsernameToUserIdMap;
}
