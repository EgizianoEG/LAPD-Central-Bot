import { DiscordAPIError } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import Mongoose from "mongoose";
const NonFatalDiscordAPIErrors: DiscordAPIError["code"][] = [10_062, 40_060, 50_001, 50_035];

export default function ErrorHandler() {
  process.on("uncaughtException", (Err) => {
    if (
      (Err instanceof DiscordAPIError && NonFatalDiscordAPIErrors.includes(Err.code)) ||
      (Err instanceof AppError && Err.code !== 0) ||
      Err instanceof Mongoose.mongo.MongoServerError
    ) {
      return AppLogger.error({
        message: "A non-fatal error has occurred - [UncaughtException].",
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
