import { APIResponses } from "@Typings/Utilities/Roblox.js";
import { APICache } from "../Other/Cache.js";
import Axios from "axios";

/**
 * Primarily retrieves the Roblox user Id(s) of the given username(s).
 * @param Usernames - The Roblox username(s) to get the Id(s) for. Can be a string or an array of strings.
 * @param ExcludeBanned - Whether to exclude banned users from the response and results.
 * @return An array of tuples or a single tuple (`[string, number, boolean]`), where each tuple contains the user ID, the exact found username, and a boolean indicating whether the user was found.
 *
 * @notice The returned tuple(s) value can be `[0, "", false]` indicating that the user was not found.
 * This can be a result of: input username wasn't found, the user is banned (optional parameter), or the HTTP request returned an error.
 *
 * @example
 * // Get the user Id of a single username.
 * // Expected result: `[1, "Roblox", true]`
 * const [ UserId, Name, IsFound ] = await GetIdByUsername("ROBLOX");
 *
 * // Get the Ids of multiple usernames.
 * // Expected result: [[6974173, "RobloxDev", true], [156, "BuilderMan", true]]
 * const Results = await GetIdByUsername(["robloxdev", "builderman"]);
 *
 * // Exclude banned users from the results.
 * // Expected result: [[0, "", false], [156, "builderman", true], [0, "", false]]
 * const Results = await GetIdByUsername(["Admin", "BuilderMan", "Gamer3D"], true);
 */
export default async function GetIdByUsername<Input extends string | string[]>(
  Usernames: Input,
  ExcludeBanned: boolean = true
): Promise<Input extends string[] ? [number, string, boolean][] : [number, string, boolean]> {
  const RequestArray: string[] = Array.isArray(Usernames) ? Usernames : [Usernames];
  const Stringified: string = RequestArray.toString();

  if (APICache.IdByUsername.has(Stringified)) {
    return APICache.IdByUsername.get(Stringified) as any;
  }

  return Axios.post<APIResponses.Users.MultiGetByNameResponse>("https://users.roblox.com/v1/usernames/users", {
    usernames: RequestArray,
    excludeBannedUsers: ExcludeBanned,
  })
    .then((Resp) => {
      let Results = RequestArray.map((Username) => {
        return Resp.data.data.find((UserObject) => UserObject.requestedUsername === Username) ?? null;
      }).map((UserObject) => {
        if (!UserObject) return [0, "", false];
        return [UserObject.id, UserObject.name, true];
      }) as any;

      Results = Array.isArray(Usernames) ? Results : Results[0];
      APICache.IdByUsername.set(Stringified, Results);

      return Results;
    })
    .catch((Err) => {
      console.log("GetIdFromUsername - Error Occurred: ", Err);
      return Array.isArray(Usernames) ? [] : [0, "", false];
    });
}