import { APIResponses } from "@Typings/Utilities/Roblox.js";
import Axios from "axios";

/**
 * Retrieves the player information from the Roblox API.
 * @param UserId - The ID of the user.
 * @return A promise that resolves to the user profile details.
 */
export default async function GetUserInfo(UserId: number | string): Promise<APIResponses.Users.GetUserResponse> {
  return Axios.get(`https://users.roblox.com/v1/users/${UserId}`).then((Resp) => Resp.data);
}
