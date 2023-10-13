import NodeCache from "node-cache";

export const APICache = {
  UsernameSearches: new NodeCache({ stdTTL: 5 * 60 }),
  IdByUsername: new NodeCache({ stdTTL: 5 * 60 }),
  PlayerInfo: new NodeCache({ stdTTL: 5 * 60 }),
};
