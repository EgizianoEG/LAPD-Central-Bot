const { CamelCase } = require("../Utilities/Strings/Converter");
const GetFiles = require("../Utilities/Other/GetFiles");
const Path = require("path");
// ----------------------------------------------------------------

/**
 * Handles all bot events and controls its logic
 * @param {DiscordClient} Client
 */
module.exports = (Client) => {
  const EventFolders = GetFiles(Path.join(__dirname, "..", "Events"), true);

  for (const EventFolder of EventFolders) {
    const FuncsToExecute = [];
    const EventName = CamelCase(EventFolder.match(/[^\\]+$/)[0]);
    const EventFiles = GetFiles(EventFolder).sort((a, b) => {
      const a_pos = a.match(/\[(\d+)\]/)?.[1];
      const b_pos = b.match(/\[(\d+)\]/)?.[1];

      if (a_pos && b_pos) return +a_pos - +b_pos;
      else if (a_pos) return -1;
      else if (b_pos) return 1;
      else return 0;
    });

    for (const EventFile of EventFiles) {
      const EventFunc = require(EventFile);
      if (typeof EventFunc === "function") {
        FuncsToExecute.push(EventFunc);
      }
    }

    Client.on(EventName, (Arg) => {
      FuncsToExecute.forEach((Func) => Func(Client, Arg));
    });
  }
};
