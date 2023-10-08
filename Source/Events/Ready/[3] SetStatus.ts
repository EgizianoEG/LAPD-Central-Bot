import { Client, ActivityType, PresenceUpdateStatus } from "discord.js";

export default function SetAppStatus(Client: Client<true>) {
  Client.user.setStatus(PresenceUpdateStatus.Online);
  Client.user.setActivity({
    type: ActivityType.Watching,
    name: "and Dispatching",
  });
}
