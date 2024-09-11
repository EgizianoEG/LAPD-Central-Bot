import { Client, ActivityType, PresenceUpdateStatus } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

export default function SetAppStatus(Client: Client<true>, ShardId: number) {
  Client.user.setStatus(PresenceUpdateStatus.Online);
  Client.user.setActivity({
    type: ActivityType.Watching,
    name: "and Dispatching",
    shardId: ShardId,
  });

  AppLogger.log("info", {
    label: "Events:ShardReady:SetStatus",
    message: "Successfully set and updated the bot status for the shard with id: %o.",
    splat: [ShardId],
  });
}
