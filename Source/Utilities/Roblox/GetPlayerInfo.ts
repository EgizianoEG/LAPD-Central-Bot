import Axios from "axios";

export default async function GetPlayerInfo(
  UserId: number | string
): Promise<Utilities.Roblox.UserProfileDetails> {
  return Axios.get(`https://users.roblox.com/v1/users/${UserId}`).then((Resp) => Resp.data);
}
