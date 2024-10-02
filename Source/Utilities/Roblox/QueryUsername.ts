import { IsValidRobloxUsername } from "../Other/Validators.js";
import { RobloxAPICache } from "../Other/Cache.js";
import { APIResponses } from "@Typings/Utilities/Roblox.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Axios from "axios";

/**
 * Searches for a user by their username and returns the search results
 * @param Username - The username to query and search for its user
 * @param [ExcludeBanned=false] - Whether to exclude banned users from the response
 * @returns A list of users representing search results
 */
export default async function QueryUsername(
  Username: string,
  ExcludeBanned: boolean = false
): Promise<APIResponses.Users.UserSearchResult[]> {
  if (!IsValidRobloxUsername(Username)) return [];
  if (RobloxAPICache.UsernameSearches.has(Username)) {
    return RobloxAPICache.UsernameSearches.get(Username) ?? [];
  }

  return Axios.post<APIResponses.Users.UserSearchPOSTResponse>(
    "https://users.roblox.com/v1/usernames/users",
    {
      usernames: [Username],
      excludeBannedUsers: ExcludeBanned,
    }
  )
    .then(({ data }) => {
      RobloxAPICache.UsernameSearches.set(Username, data.data);
      return data.data;
    })
    .catch((Err) => {
      AppLogger.error({
        message: "Could not query '%s' username;",
        label: "Utils:Roblox:QueryUsername",
        splat: [Username],
        stack: Err.stack,
        details: { ...Err },
      });
      return [];
    });
}
