import { GuildSettingsCache } from "@Utilities/Other/Cache.js";
import { Guilds } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";
type HydratedGuildSettings = Mongoose.HydratedSingleSubdocument<Guilds.GuildSettings>;

/**
 * Retrieves the settings for a specific guild from the database.
 * @param {string} GuildId - The unique identifier of the guild to fetch settings for.
 * @param {boolean} [Lean=true] - Determines whether the query result should be a plain JavaScript object
 *                                (lean mode) or a full Mongoose document. Defaults to `true`.
 * @param {boolean} [UseCache=true] - Determines whether to first check the cache for the guild's settings. Defaults to `true`.
 * @returns A promise that resolves to the guild's settings if found, or `null` if the guild does not exist.
 */
export default async function GetGuildSettings<ReturnLeaned extends boolean | undefined = true>(
  GuildId: string,
  Lean?: ReturnLeaned,
  UseCache: boolean = true
): Promise<ReturnLeaned extends true ? HydratedGuildSettings | null : Guilds.GuildSettings | null> {
  if (UseCache) {
    const CachedSettings = GuildSettingsCache.get<HydratedGuildSettings | Guilds.GuildSettings>(
      `${GuildId}:${Lean}`
    );

    if (CachedSettings) return CachedSettings as any;
  }

  return GuildModel.findById(GuildId)
    .select("settings")
    .lean(Lean)
    .then((GuildData) => {
      if (!GuildData) return null;
      GuildSettingsCache.set(`${GuildId}:${Lean}`, GuildData.settings);
      return GuildData.settings;
    }) as any;
}
