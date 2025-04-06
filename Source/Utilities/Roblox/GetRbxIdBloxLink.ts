import { BloxlinkDiscordToRobloxUsageChache } from "@Utilities/Other/Cache.js";
import { RedactTextByOptions } from "@Utilities/Strings/Redactor.js";
import { differenceInDays } from "date-fns";
import { Bloxlink } from "@Typings/Utilities/APIResponses.js";
import { Other } from "@Config/Secrets.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Axios from "axios";

const MaxUserRequestsPerDay = 3;
type UserLimitInfo = {
  count: number;
  last_request: Date;
};

/**
 * Retrieves the Roblox Id associated with a given Discord user Id using the Bloxlink API.
 * @param DiscordUserId - The Discord user ID to look up.
 * @returns A promise that resolves to the Roblox ID if found, or null if not found or the API request failed for some reason (including rate limit).
 * This function is safe that it will return null if any error occurs.
 */
export default async function GetRobloxIdFromDiscordBloxlink(
  DiscordUserId: string
): Promise<number | null> {
  const CurrentTime = new Date();
  const UserLimitInfo = BloxlinkDiscordToRobloxUsageChache.get<UserLimitInfo>(DiscordUserId);

  if (UserLimitInfo) {
    if (differenceInDays(CurrentTime, UserLimitInfo.last_request) < 1) {
      if (UserLimitInfo.count >= MaxUserRequestsPerDay) {
        return null;
      } else {
        BloxlinkDiscordToRobloxUsageChache.set(DiscordUserId, {
          count: UserLimitInfo.count + 1,
          last_request: CurrentTime,
        });
      }
    } else {
      BloxlinkDiscordToRobloxUsageChache.set(DiscordUserId, {
        count: 1,
        last_request: CurrentTime,
      });
    }
  } else {
    BloxlinkDiscordToRobloxUsageChache.set(DiscordUserId, { count: 1, last_request: CurrentTime });
  }

  return Axios.get<Bloxlink.GlobalDiscordToRobloxIdResponse>(
    `https://api.blox.link/v4/public/discord-to-roblox/${DiscordUserId}`,
    {
      headers: { Authorization: Other.BloxlinkAPIKey },
    }
  )
    .then((Resp) => Number(Resp.data.robloxID) || null)
    .catch((Err: unknown) => {
      if (
        Axios.isAxiosError(Err) &&
        Err.response?.status === 400 &&
        typeof Err.response.data?.error === "string" &&
        !!Err.response.data.error.match(/\bInvalid API Key\b/i)
      ) {
        AppLogger.warn({
          label: "Utilities:Roblox:GetRbxIdBloxLink",
          message:
            "Provided Bloxlink API key is invalid. Make sure it is correct and has global access.",
          stack: Err.stack,
          data: Err.response.data,
          status: Err.response.status,
          api_key: RedactTextByOptions(Other.BloxlinkAPIKey, { from_pattern: /\b\w+$/ }),
        });
      }
      return null;
    });
}
