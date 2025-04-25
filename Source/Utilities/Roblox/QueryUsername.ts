import { RobloxQueryUsernameResultsCache } from "@Utilities/Other/Cache.js";
import { IsValidRobloxUsername } from "../Other/Validators.js";
import NobloxJs from "noblox.js";

/**
 * Queries Roblox for users matching the provided username keyword.
 * @param Typed - The username keyword to search for. Must be a valid Roblox username.
 * @param Limit - The maximum number of results to return. Defaults to 10.
 *                Accepted values are 10, 25, 50, or 100.
 * @returns A promise that resolves to an array of user search results.
 *          Returns an empty array if the provided username is invalid.
 */
export default async function QueryUsername(Typed: string, Limit: 10 | 25 | 50 | 100 = 10) {
  if (!IsValidRobloxUsername(Typed)) return [];
  const CachedResults =
    RobloxQueryUsernameResultsCache.get<Awaited<ReturnType<typeof NobloxJs.searchUsers>>>(Typed);
  if (CachedResults) return CachedResults;

  return NobloxJs.searchUsers(Typed, Limit, undefined as any).then((Res) => {
    RobloxQueryUsernameResultsCache.set(Typed, Res);
    return Res;
  });
}
