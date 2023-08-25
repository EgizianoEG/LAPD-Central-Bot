const NodeCache = require("node-cache");
// -------------------------------------

module.exports.APICache = {
  UsernameSearches: new NodeCache({ stdTTL: 5 * 60 }),
  IdByUsername: new NodeCache({ stdTTL: 5 * 60 }),
  PlayerInfo: new NodeCache({ stdTTL: 5 * 60 }),
};
