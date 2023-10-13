import QueryUsername from "../Roblox/QueryUsername.js";

/**
 * Autocompletes an input Roblox username
 * @param Username The username to query and search for its user
 * @returns An array of suggestions
 */
export default async function AutocompleteUsername(
  Username: string
): Promise<Array<{ name: string; value: string }>> {
  return (await QueryUsername(Username)).map((Result) => {
    return { name: Result.Name, value: Result.Name };
  });
}
