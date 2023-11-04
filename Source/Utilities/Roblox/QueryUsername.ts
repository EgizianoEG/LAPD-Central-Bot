import { APICache } from "../Other/Cache.js";
import { APIResponses } from "@Typings/Utilities/Roblox.js";
import { IsValidRobloxUsername } from "../Other/Validator.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Axios from "axios";

/**
 * Searches for a user by their username and returns the search results
 * @param Username - The username to query and search for its user
 * @returns A list of users representing search results
 */
export default async function QueryUsername(
  Username: string
): Promise<APIResponses.Users.UserSearchResult[]> {
  if (!IsValidRobloxUsername(Username)) return [];
  if (APICache.UsernameSearches.has(Username)) {
    return APICache.UsernameSearches.get(Username) ?? [];
  }

  return Axios.get<APIResponses.Users.UserSearchQueryResponse>(
    `https://www.roblox.com/search/users/results?keyword=${Username}&maxRows=25`
  )
    .then(({ data }) => {
      if (data.UserSearchResults) {
        APICache.UsernameSearches.set(Username, data.UserSearchResults);
        return data.UserSearchResults;
      } else {
        APICache.UsernameSearches.set(Username, []);
        return [];
      }
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
