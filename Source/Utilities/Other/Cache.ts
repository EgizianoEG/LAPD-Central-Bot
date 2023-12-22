import type { ButtonInteraction } from "discord.js";
import ShiftActionLogger from "../Classes/ShiftActionLogger.js";
import ShiftModel from "@Models/Shift.js";
import IsLoggedIn from "@Utilities/Database/IsUserLoggedIn.js";
import NodeCache from "node-cache";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetUserPresence, {
  UserPresence as RobloxUserPresence,
} from "@Utilities/Roblox/GetUserPresence.js";
import HandleRoleAssignment from "./HandleShiftRoleAssignment.js";

export const RobloxAPICache = {
  UsernameSearches: new NodeCache({ stdTTL: 5 * 60, useClones: false }),
  IdByUsername: new NodeCache({ stdTTL: 5 * 60, useClones: false }),
};

// -----------------------------------------------------------------------
/**
 * For verifying shift status on behalf of the user
 * like ending the shift if they aren't anymore in-game.
 *
 * Key value pairs that should be like the following:
 * `[ActiveShiftId]: DiscordUserInteract`
 */
export const ActiveShiftsCache = new NodeCache({
  stdTTL: 2 * 60,
  checkperiod: 2 * 60,
  useClones: false,
  deleteOnExpire: false,
});

const UserPresenceChecks: Record<string, number> = {};

ActiveShiftsCache.on("del", (ShiftId) => delete UserPresenceChecks[ShiftId]);
ActiveShiftsCache.on("set", (ShiftId) => {
  UserPresenceChecks[ShiftId] = 0;
});

ActiveShiftsCache.on("expired", async function CheckShift(
  ShiftId: string,
  DiscordUserInteract: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">
) {
  try {
    const LinkedRobloxUserId = await IsLoggedIn(DiscordUserInteract);
    if (!LinkedRobloxUserId) {
      try {
        const ShiftDoc = await ShiftModel.findById(ShiftId).exec();
        if (ShiftDoc) {
          await ShiftDoc.end();
          await HandleRoleAssignment(
            "off-duty",
            DiscordUserInteract.client,
            ShiftDoc.guild,
            ShiftDoc.user
          );

          await ShiftActionLogger.LogShiftAutomatedEnd(
            ShiftDoc,
            DiscordUserInteract,
            "Roblox user not linked anymore"
          );
        }
        return ActiveShiftsCache.del(ShiftId);
      } catch (Err: any) {
        return AppLogger.error({
          label: "Utilities:Other:Cache",
          message: "Failed to automatically end shift (user not linked anymore);",
          stack: Err.stack,
        });
      }
    }

    const UserPresence = (await GetUserPresence(LinkedRobloxUserId)) as RobloxUserPresence;
    if (UserPresence.userPresenceType === 2) {
      UserPresenceChecks[ShiftId] = 0;
    } else {
      if (++UserPresenceChecks[ShiftId] <= 6) return;
      try {
        const ShiftDoc = await ShiftModel.findById(ShiftId).exec();
        if (ShiftDoc) {
          await ShiftDoc.end();
          await HandleRoleAssignment(
            "off-duty",
            DiscordUserInteract.client,
            ShiftDoc.guild,
            ShiftDoc.user
          );

          await ShiftActionLogger.LogShiftAutomatedEnd(
            ShiftDoc,
            DiscordUserInteract,
            "Roblox user not in-game"
          );
        }
      } catch (Err: any) {
        return AppLogger.error({
          label: "Utilities:Other:Cache",
          message: "Failed to automatically end shift (user not in-game);",
          stack: Err.stack,
        });
      }
    }
  } catch (Err: any) {}
} as any);
