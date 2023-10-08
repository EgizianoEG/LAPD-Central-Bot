import { APICache } from "../Other/Cache.js";
import { IsValidRobloxUsername } from "../Other/Validator.js";
import Axios, { AxiosResponse } from "axios";

interface APIQueryResponse {
  Keyword: string;
  StartIndex: number;
  MaxRows: number;
  TotalResults: number;
  UserSearchResults: Utilities.Roblox.UserSearchResult[];
}

/**
 * Searches for a user by their username and returns the search results
 * @param Username - The username to query and search for its user
 * @returns A list of users representing search results
 */
export default async function QueryUsername(
  Username: string
): Promise<Utilities.Roblox.UserSearchResult[]> {
  if (!IsValidRobloxUsername(Username)) return [];
  if (APICache.UsernameSearches.has(Username)) {
    return APICache.UsernameSearches.get(Username) ?? [];
  }

  return Axios.get(`https://www.roblox.com/search/users/results?keyword=${Username}&maxRows=25`)
    .then(({ data }: AxiosResponse<APIQueryResponse>) => {
      if (data.UserSearchResults) {
        APICache.UsernameSearches.set(Username, data.UserSearchResults);
        return data.UserSearchResults;
      } else {
        return [];
      }
    })
    .catch((Err) => {
      console.log("QueryUsername - Could not query requested username;", Err);
      return [];
    });
}
