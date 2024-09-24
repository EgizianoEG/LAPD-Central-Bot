import { DiscordAPIError, DiscordjsError, DiscordjsErrorCodes } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import Mongoose from "mongoose";

const FatalDiscordAPIErrorCodes: DiscordAPIError["code"][] = [50_014, 50_017];
const FatalDiscordJSErrors: DiscordjsErrorCodes[] = [
  DiscordjsErrorCodes.TokenInvalid,
  DiscordjsErrorCodes.TokenMissing,
  DiscordjsErrorCodes.ClientNotReady,
  DiscordjsErrorCodes.ClientMissingIntents,
];

export default function ErrorHandler() {
  process.on("uncaughtException", (Err) => {
    if (
      (Err instanceof DiscordAPIError && !FatalDiscordAPIErrorCodes.includes(Err.code)) ||
      (Err instanceof DiscordjsError && !FatalDiscordJSErrors.includes(Err.code)) ||
      (Err instanceof AppError && Err.code !== 0) ||
      Err instanceof Mongoose.mongo.MongoServerError
    ) {
      return AppLogger.error({
        message: "A non-fatal error has occurred - [UncaughtException].",
        label: "Handlers:ErrorHandler",
        stack: Err.stack,
      });
    }

    AppLogger.fatal({
      message: "A fatal error has occurred [UncaughtException]. Terminating process.",
      label: "Handlers:ErrorHandler",
      stack: Err.stack,
    });

    process.exit(1);
  });
}
