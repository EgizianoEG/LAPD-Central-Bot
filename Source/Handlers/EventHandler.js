// eslint-disable-next-line no-unused-vars
const { Client } = require("discord.js");
const { CamelCase } = require("../Utilities/Strings/Converter");
const GetFiles = require("../Utilities/General/GetFiles");
const Path = require("path");
// ----------------------------------------------------------------
/**
 * Handles all bot events and controls its logic
 * @param {Client} Client
 */
module.exports = (Client) => {
  const EventFolders = GetFiles(Path.join(__dirname, "..", "Events"), true);

  for (const EventFolder of EventFolders) {
    const FuncsToExecute = [];
    const EventName = CamelCase(EventFolder.match(/[^\\]+$/)[0]);
    const EventFiles = GetFiles(EventFolder).sort((a, b) => {
      const a_pos = a.match(/\[(\d+)\]/)?.[1];
      const b_pos = b.match(/\[(\d+)\]/)?.[1];
      return a_pos && b_pos ? a_pos - b_pos : a_pos ? -1 : b_pos ? 1 : 0;
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
