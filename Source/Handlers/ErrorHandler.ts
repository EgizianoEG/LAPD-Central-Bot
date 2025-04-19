import { DiscordAPIError, DiscordjsError, DiscordjsErrorCodes } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import Mongoose from "mongoose";

const FatalDiscordAPIErrorCodes: DiscordAPIError["code"][] = [50_014, 50_017];
const NonFatalErrorsFromConstructors: string[] = ["ValidationError", "VersionError"];
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
      Err instanceof Mongoose.mongo.MongoServerError ||
      Err instanceof RangeError ||
      Err instanceof ReferenceError ||
      NonFatalErrorsFromConstructors.includes(Err.constructor.name)
    ) {
      // Non-fatal errors that can be logged and ignored without terminating the process.
      // These errors are either recoverable or do not compromise the app's core functionality.
      return AppLogger.error({
        message: "A non-fatal error has occurred. [%s]:",
        label: "Handlers:ErrorHandler",
        splat: [Err.constructor.name],
        stack: Err.stack,
      });
    }

    AppLogger.fatal({
      message: "An unrecoverable error has occurred. Terminating process. [%s]:",
      label: "Handlers:ErrorHandler",
      splat: [Err.constructor.name],
      stack: Err.stack,
    });

    process.exit(1);
  });
}
