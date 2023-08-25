const { ActivityType, PresenceUpdateStatus } = require("discord.js");

/**
 * @param {DiscordClient} Client
 */
module.exports = (Client) => {
  Client.user.setStatus(PresenceUpdateStatus.Online);
  Client.user.setActivity({
    type: ActivityType.Watching,
    name: "and Dispatching",
  });
};
