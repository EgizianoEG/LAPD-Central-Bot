import { Client, ActivityType, PresenceUpdateStatus } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

export default function SetAppStatus(Client: Client<true>) {
  Client.user.setStatus(PresenceUpdateStatus.Online);
  Client.user.setActivity({
    type: ActivityType.Watching,
    name: "and Dispatching",
  });

  AppLogger.log("info", {
    label: "Ready:SetStatus",
    message: "Successfully set and updated the bot status.",
  });
}
