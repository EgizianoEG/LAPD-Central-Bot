import { APICache } from "../Other/Cache.js";
import Axios, { AxiosResponse } from "axios";

interface APIResponseData {
  data: [
    {
      id: number;
      name: string;
      displayName: string;
      hasVerifiedBadge: boolean;
      requestedUsername: string;
    },
  ];
}

/**
 * Returns the user id of the input username string
 * @param Usernames - The username to get its id from
 * @param ExcludeBanned - Whether to exclude banned users from the response
 * @return The user id (number) of the input username as the first tuple item
 * or `null` if input is invalid, user is banned (optional param), or the http response was invalid.
 * Second tuple item is the exact username of the input one returned from Roblox (as it can differ from the original)
 */
export default async function GetIdFromUsername(
  Usernames: string | string[],
  ExcludeBanned: boolean | undefined = true
): Promise<[number, string][] | ([number, string] | null)> {
  const RequestArray = Array.isArray(Usernames) ? Usernames : [Usernames];
  const Stringified = RequestArray.toString();

  if (APICache.IdByUsername.has(Stringified)) {
    return APICache.IdByUsername.get(Stringified) ?? null;
  }

  return Axios.post("https://users.roblox.com/v1/usernames/users", {
    usernames: RequestArray,
    excludeBannedUsers: ExcludeBanned,
  })
    .then((Resp: AxiosResponse<APIResponseData>) => {
      let Results = RequestArray.map((Username) => {
        return Resp.data.data.find((UserObject) => UserObject.requestedUsername === Username);
      }).map((UserObject) => {
        if (!UserObject?.id) return [null, null];
        return [UserObject.id, UserObject.name];
      }) as any;

      Results = Usernames.length > 1 ? Results : Results[0];
      APICache.IdByUsername.set(Stringified, Results);

      return Results;
    })
    .catch((Err) => {
      console.log("GetIdFromUsername - Error Occurred: ", Err);
      return null;
    });
}
