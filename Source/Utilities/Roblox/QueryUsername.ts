import { APICache } from "../Other/Cache.js";
import { RobloxAPI } from "@Typings/Utilities/Roblox.js";
import { IsValidRobloxUsername } from "../Other/Validator.js";
import Axios, { AxiosResponse } from "axios";

/**
 * Searches for a user by their username and returns the search results
 * @param Username - The username to query and search for its user
 * @returns A list of users representing search results
 */
export default async function QueryUsername(
  Username: string
): Promise<RobloxAPI.Users.UserSearchResult[]> {
  if (!IsValidRobloxUsername(Username)) return [];
  if (APICache.UsernameSearches.has(Username)) {
    return APICache.UsernameSearches.get(Username) ?? [];
  }

  return Axios.get(`https://www.roblox.com/search/users/results?keyword=${Username}&maxRows=25`)
    .then(({ data }: AxiosResponse<RobloxAPI.Users.UserSearchQueryResponse>) => {
      if (data.UserSearchResults) {
        APICache.UsernameSearches.set(Username, data.UserSearchResults);
        return data.UserSearchResults;
      } else {
        APICache.UsernameSearches.set(Username, []);
        return [];
      }
    })
    .catch((Err) => {
      console.log("QueryUsername - Could not query requested username;", Err);
      return [];
    });
}