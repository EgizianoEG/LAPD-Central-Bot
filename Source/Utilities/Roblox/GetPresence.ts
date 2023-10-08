import Axios, { AxiosResponse } from "axios";

/**
 * Checks the presence of specific user(s).
 * @param UserIDs - The User IDs to get presence information
 * @returns A list of users representing search results; User presence Type ['Offline' = 0, 'Online' = 1, 'InGame' = 2, 'InStudio' = 3, 'Invisible' = 4].
 *  - - If a single User ID is provided, the promise resolves to a single UserPresence object.
 *  - - If multiple User IDs are provided, the promise resolves to an array of UserPresence objects.
 */
export default async function GetPresence(UserIDs: string | number | Array<number | string>) {
  if (!UserIDs || UserIDs === "0") {
    throw new Error("Invalid 'UserIDs' argument was received.");
  }

  const IdsArray = Array.isArray(UserIDs) ? UserIDs : [UserIDs];
  const Payload = { userIds: IdsArray };
  const RequestURL = "https://presence.roblox.com/v1/presence/users";

  return Axios.post(RequestURL, Payload).then(
    (Resp: AxiosResponse<{ userPresences: Utilities.Roblox.UserPresence[] }>) => {
      return IdsArray.length > 1 ? Resp.data.userPresences : Resp.data.userPresences[0];
    }
  );
}
