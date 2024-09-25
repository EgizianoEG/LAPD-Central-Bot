import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import QueryUsername from "../Roblox/QueryUsername.js";

/**
 * Autocompletes an input Roblox username.
 * @param Username The username to query and search for its user.
 * @returns An array of suggestions.
 */
export default async function AutocompleteUsername(
  Username: string
): Promise<Array<{ name: string; value: string }>> {
  Username = Username.match(/\w{3,20} \(@(\w{3,20})\)/i)?.[1] ?? Username;
  return (await QueryUsername(Username.trim()))
    .map((Result) => {
      return { name: FormatUsername(Result), value: Result.name };
    })
    .slice(0, 25);
}
