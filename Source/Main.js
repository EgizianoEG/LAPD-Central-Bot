const { Client, Collection, GatewayIntentBits } = require("discord.js");
const {
  Discord: { BotToken },
  Roblox: { Cookie },
} = require("./Config/Secrets.json");

const Chalk = require("chalk");
const Noblox = require("noblox.js");
const MongoDBHandler = require("./Handlers/MongoDB");
const EventHandler = require("./Handlers/EventHandler");
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

App.login(BotToken)
  .then(() => {
    if (!App.user) throw new Error("`App.user` is not accessible.");
    console.info("✅ - %s bot is online.", Chalk.cyanBright.bold(App.user.username));
  })
  .catch((Err) =>
    console.error("❎ - %s", Chalk.red("Failed to run the application. Details:\n"), Err)
  );

Noblox.setCookie(Cookie)
  .then((UserData) => {
    console.log("✅ - Logged into Roblox as %s.", Chalk.cyanBright.bold(UserData.UserName));
  })
  .catch((Err) => {
    console.log("❎ - %s Could not log into Roblox. Details:\n", Chalk.red("ERROR"), Err);
  });

EventHandler(App);
MongoDBHandler();
