import { Discord as DiscordSecrets, Roblox as RobloxSecrets } from "@Config/Secrets.js";
import { Client, Collection, GatewayIntentBits } from "discord.js";

import Chalk from "chalk";
import Noblox from "noblox.js";
import EventHandler from "./Handlers/EventHandler.js";
import MongoDBHandler from "./Handlers/MongoDB.js";

console.log(Chalk.grey("================================================"));
// ----------------------------------------------------------------------------------

const App = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

App.commands = new Collection();
App.cooldowns = new Collection();

App.login(DiscordSecrets.BotToken)
  .then(() => {
    if (!App.user) throw new Error("`App.user` is not accessible.");
    console.info("✅ - %s bot is online.", Chalk.cyanBright.bold(App.user.username));
  })
  .catch((Err) =>
    console.error("❎ - %s", Chalk.red("Failed to run the application. Details:\n"), Err)
  );

Noblox.setCookie(RobloxSecrets.Cookie)
  .then((UserData) => {
    console.log("✅ - Logged into Roblox as %s.", Chalk.cyanBright.bold(UserData.UserName));
  })
  .catch((Err) => {
    console.log("❎ - %s Could not log into Roblox. Details:\n", Chalk.red("ERROR"), Err);
  });

EventHandler(App);
MongoDBHandler();