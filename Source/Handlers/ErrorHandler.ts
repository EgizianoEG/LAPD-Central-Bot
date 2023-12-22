import { DiscordAPIError } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

export default function ErrorHandler() {
  process.on("uncaughtException", (Err) => {
    if (Err instanceof DiscordAPIError && Err.code === 50_001) {
      return AppLogger.error({
        message: "A non-fatal Discord API error has occurred [UncaughtException].",
        label: "Handlers:ErrorHandler",
        stack: Err.stack,
        details: {
          ...Err,
        },
      });
    }

    AppLogger.fatal({
      message: "A fatal error has occurred [UncaughtException]. Terminating process.",
      label: "Handlers:ErrorHandler",
      stack: Err.stack,
      details: {
        ...Err,
      },
    });

    process.exit(1);
  });
}
