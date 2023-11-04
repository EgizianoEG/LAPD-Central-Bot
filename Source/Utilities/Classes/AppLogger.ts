import { OmitByValue } from "utility-types";
import Splatter from "./Splatter.js";
import Winston from "winston";
import Config from "@Config/Shared.js";
import Axios, { AxiosError } from "axios";
import Chalk from "chalk";
import Util from "node:util";

type CustomLogger<Levels> = OmitByValue<Winston.Logger, Winston.LeveledLogMethod> & {
  // eslint-disable-next-line no-unused-vars
  readonly [Level in keyof Levels]: Winston.LeveledLogMethod;
} & { log(level: keyof Levels, message: any): Winston.Logger };

const LogLevel = Config.Env.LogLevel ?? "debug";
const LogLabels = false;

const LevelsData = {
  Levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  },
  Colors: {
    fatal: "black redBG",
    error: "red",
    warn: "yellow",
    info: "blue",
    debug: "cyan",
  },
};

const Format = Winston.format;
const Transports = Winston.transports;
const SplatFormat = (opts: Util.InspectOptions) => new Splatter(opts);
const ColorizeLevel = Format.colorize({ colors: LevelsData.Colors }).colorize;
const IgnorePrivateLogs = Format((Info) => {
  if (Info.private) {
    return false;
  }
  return Info;
});

// TODO: Add transport for a cloud logging service
const AppLogger = Winston.createLogger({
  level: LogLevel,
  levels: LevelsData.Levels,
  format: Format.errors({ stack: true }),
  transports: [
    new Transports.Http({
      level: "warn",
      format: Format.combine(
        IgnorePrivateLogs(),
        Format.timestamp(),
        Format.metadata(),
        Format.json({ space: 2 })
      ),
    }),

    new Transports.Console({
      format: Format.combine(
        SplatFormat({ colors: true }),
        Format.timestamp({ format: "hh:mm:ss A" }),
        Format.metadata(),

        Format.printf((Info) => {
          const LogLabel: string | undefined = LogLabels
            ? Info.label ?? Info.metadata?.label
            : null;
          const ErrorStack: string | undefined = Info.stack ?? Info.metadata?.stack;
          const Timestamp: string = Info.timestamp ?? Info.metadata.timestamp;
          let Description: string = Info.message;

          if (ErrorStack) {
            Info.metadata.stack = ErrorStack.replace(
              /(at .+ )\((.+:\d+:\d+)\)/g,
              (_, AtText: string, Path: string) => {
                if (!Path.startsWith("node:")) Path = `file:///${Path}`;
                Path = Path.replaceAll("\\", "/").replaceAll(" ", "%20");
                Path = Path.replace(/:(\d+):(\d+)/g, (_, N1, N2) => {
                  const Colon = Chalk.white(":");
                  return `${Colon}${Chalk.yellow(N1)}${Colon}${Chalk.yellow(N2)}`;
                });
                return `${AtText}(${Chalk.cyan.dim(Path)})`;
              }
            );

            if (Info.metadata.title) {
              Description = `${Info.metadata.title}; ${Info.message}\n    ${Info.metadata.stack}`;
            } else {
              Description = `${Info.message}\n    ${Info.metadata.stack}`;
            }
          }

          return Util.format(
            "%s %s%s: %s",
            Chalk.gray(`[${Timestamp}]`),
            LogLabel ? Chalk.grey(`[${LogLabel}] `) : "",
            ColorizeLevel(Info.level, Info.level.toUpperCase()),
            Description
          );
        })
      ),
    }),
  ],
}) as unknown as CustomLogger<typeof LevelsData.Levels>;

// --------------------------------------------------------------------------------------
export type LogLevels = typeof LevelsData.Levels;
export default AppLogger;
