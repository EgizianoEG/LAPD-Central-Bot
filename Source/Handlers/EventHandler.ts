import { GetDirName } from "@Utilities/Other/Paths.js";
import { CamelCase } from "@Utilities/Strings/Converters.js";
import { Events } from "discord.js";

import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetFiles from "@Utilities/Other/GetFilesFrom.js";
import Path from "node:path";

export default async function EventHandler(Client: DiscordClient) {
  const EventFolders = GetFiles(Path.join(GetDirName(import.meta.url), "..", "Events"), true);
  const ListenersData: Record<string, number> = {};
  const ClientEvents = Object.values(Events) as string[];

  for (const EventFolder of EventFolders) {
    const FuncsToExecute: ((Client: DiscordClient, ...Args: any[]) => any)[] = [];
    const EventName = CamelCase(Path.basename(EventFolder) ?? "");
    const EventFiles = GetFiles(EventFolder).sort((a, b) => {
      const a_pos = a.match(/\[(\d+)\]/)?.[1];
      const b_pos = b.match(/\[(\d+)\]/)?.[1];

      if (a_pos && b_pos) return +a_pos - +b_pos;
      else if (a_pos) return -1;
      else if (b_pos) return 1;
      else return 0;
    });

    for (const EventFile of EventFiles) {
      const EventFunc = (await import(EventFile)).default as (typeof FuncsToExecute)[number];
      if (typeof EventFunc === "function") {
        FuncsToExecute.push(EventFunc);
      }
    }

    if (ClientEvents.includes(EventName)) {
      ListenersData[EventName] = FuncsToExecute.length;
      Client.on(EventName, (...Args) => {
        FuncsToExecute.forEach((Func) => Func(Client, ...Args));
      });
    } else {
      AppLogger.warn({
        label: "Handlers:EventHandler",
        message:
          "Listening to event '%s' was skipped as it does not exist in DiscordJS Client instance.",
        splat: [EventName],
        details: {
          event: EventName,
          total_funcs: FuncsToExecute.length,
        },
      });
    }
  }

  AppLogger.info({
    label: "Handlers:EventHandler",
    message:
      "Successfully loaded all event listeners. Listening for the %o events with %o total listeners.",
    splat: [
      Object.entries(ListenersData).length,
      Object.values(ListenersData).reduce((prev, curr) => prev + curr, 0),
    ],
  });
}
