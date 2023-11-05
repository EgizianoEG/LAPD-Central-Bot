import { Events } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

export default function ClientLogging(Client: DiscordClient) {
  const LogLevels: ("error" | "debug" | "warn")[] = [Events.Debug, Events.Warn, Events.Error];
  LogLevels.forEach((Level) => {
    Client.on(Level, (Msg: any) => {
      AppLogger.log(Level, {
        label: "DiscordClient",
        message: Msg.message ?? Msg,
        stack: Msg.stack,
        details: typeof Msg === "object" ? { ...Msg } : undefined,
      });
    });
  });
}
