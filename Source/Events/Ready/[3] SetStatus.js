// eslint-disable-next-line
const { Client, ActivityType, PresenceUpdateStatus } = require("discord.js");

/**
 * @param {Client} Client
 */
module.exports = (Client) => {
  Client.user.setStatus(PresenceUpdateStatus.Online);
  Client.user.setActivity({
    type: ActivityType.Watching,
    name: "and Dispatching",
    details: "Monitoring and Receiving Calls",
  });
};
