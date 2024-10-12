import { Other } from "@Config/Secrets.js";
import Axios from "axios";

interface BloxlinkDiscordToRobloxIdResponse {
  robloxID: string;
  resolved: object;
}

export default async function GetRobloxIdFromDiscordBloxlink(
  DiscordUserId: string
): Promise<number | null> {
  return Axios.get<BloxlinkDiscordToRobloxIdResponse>(
    `https://api.blox.link/v4/public/roblox-to-discord/${DiscordUserId}`,
    {
      headers: { Authorization: Other.BloxlinkAPIKey },
    }
  ).then((Resp) => Number(Resp.data.robloxID) || null);
}
