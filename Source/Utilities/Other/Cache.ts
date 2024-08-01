import NodeCache from "node-cache";

export const RobloxAPICache = {
  UsernameSearches: new NodeCache({ stdTTL: 5 * 60, useClones: false }),
  IdByUsername: new NodeCache({ stdTTL: 5 * 60, useClones: false }),
};

export const DBRolePermsCache = new NodeCache({
  stdTTL: 5 * 60,
  useClones: false,
  deleteOnExpire: true,
});

export const UserPermsCache = new NodeCache({
  stdTTL: 5 * 60,
  useClones: false,
  deleteOnExpire: true,
});
