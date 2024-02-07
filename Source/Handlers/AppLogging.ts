import { Events } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Mongoose from "mongoose";

export default function AppLogging(Client: DiscordClient) {
  const DisAppLogLevels: ("error" | "debug" | "warn")[] = [Events.Debug, Events.Warn, Events.Error];
  DisAppLogLevels.forEach((Level) => {
    Client.on(Level, (Msg: any) => {
      AppLogger.log(Level, {
        label: "DiscordClient",
        message: Msg.message ?? Msg,
        stack: Msg.stack,
        details: typeof Msg === "object" ? { ...Msg } : undefined,
      });
    });
  });

  Mongoose.set("debug", function OnMongooseDebug(CollectionName, MethodName, ...MethodArgs) {
    AppLogger.debug({
      label: "Mongoose",
      message: "%s - %s(...)",
      splat: [CollectionName, MethodName],
      details: {
        method: MethodName,
        collection: CollectionName,
        method_args: MethodArgs,
      },
    });
  });
}
