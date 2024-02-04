import { Client, Collection, GatewayIntentBits } from "discord.js";
import { Discord as DiscordSecrets } from "@Config/Secrets.js";
import { GetDirName } from "@Utilities/Other/Paths.js";

import Path from "node:path";
import Chalk from "chalk";
import GetFiles from "@Utilities/Other/GetFilesFrom.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
console.log(Chalk.grey("================================================"));
// ----------------------------------------------------------------------------------

export const App = new Client({
  intents: [
    //
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

App.commands = new Collection();
App.cooldowns = new Collection();
App.modalListeners = new Collection();
App.buttonListeners = new Collection();

(async function RunApplication() {
  const DirPath = Path.join(GetDirName(import.meta.url), "Handlers");
  const Files = GetFiles(DirPath);

  for (const File of Files) {
    await import(File).then((Module) => {
      if (typeof Module.default === "function") {
        return Module.default(App);
      }
    });
  }

  await App.login(DiscordSecrets.BotToken)
    .then(() => {
      if (!App.user) throw new Error("`App.user` is not accessible.");
      AppLogger.info({
        label: "Main.ts",
        message: "%s bot is online.",
        splat: [Chalk.cyanBright.bold(App.user.username)],
      });
    })
    .catch((Err) => {
      AppLogger.fatal("Failed to run the application. Details:", {
        label: "Main.ts",
        stack: Err.stack,
      });
    });
})();
