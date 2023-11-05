import { GetDirName } from "@Utilities/Other/Paths.js";
import { CamelCase } from "@Utilities/Strings/Converter.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetFiles from "@Utilities/Other/GetFilesFrom.js";
import Path from "node:path";

export default async function EventHandler(Client: DiscordClient) {
  const EventFolders = GetFiles(Path.join(GetDirName(import.meta.url), "..", "Events"), true);
  console.log("RenderTesting - EventHandler; using event folders: %o", EventFolders);

  for (const EventFolder of EventFolders) {
    const FuncsToExecute: ((Client: DiscordClient, ...Args: any[]) => any)[] = [];
    const EventName = CamelCase(EventFolder.match(/[^\\]+$/)?.[0] ?? "");
    const EventFiles = GetFiles(EventFolder).sort((a, b) => {
      const a_pos = a.match(/\[(\d+)\]/)?.[1];
      const b_pos = b.match(/\[(\d+)\]/)?.[1];

      if (a_pos && b_pos) return +a_pos - +b_pos;
      else if (a_pos) return -1;
      else if (b_pos) return 1;
      else return 0;
    });

    console.log(
      "RenderTesting - EventHandler; processing event folder '%s' with %o total files",
      Path.basename(EventFolder),
      EventFiles.length
    );

    for (const EventFile of EventFiles) {
      const EventFunc = (await import(EventFile)).default as (typeof FuncsToExecute)[number];
      if (typeof EventFunc === "function") {
        FuncsToExecute.push(EventFunc);
      }
    }

    console.log(
      "RenderTesting - EventHandler; listening for event '%s' with %o total functions",
      EventName,
      FuncsToExecute.length
    );

    Client.on(EventName, (...Args) => {
      FuncsToExecute.forEach((Func) => Func(Client, ...Args));
    });
  }

  AppLogger.info({
    label: "Handlers:EventHandler",
    message: "Successfully loaded all event listeners.",
  });
}
