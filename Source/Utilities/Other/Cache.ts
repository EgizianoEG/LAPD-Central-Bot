import { secondsInDay } from "date-fns/constants";
import NodeCache from "node-cache";

export const RobloxAPICache = {
  UsernameSearches: new NodeCache({ stdTTL: 5 * 60, useClones: false }),
  IdByUsername: new NodeCache({ stdTTL: 5 * 60, useClones: false }),
};

export const DBRolePermsCache = new NodeCache({
  stdTTL: 0.5 * 60,
  useClones: false,
  deleteOnExpire: true,
});

export const UserPermsCache = new NodeCache({
  stdTTL: 0.5 * 60,
  useClones: false,
  deleteOnExpire: true,
});

export const BloxlinkDiscordToRobloxUsageChache = new NodeCache({
  stdTTL: secondsInDay,
  useClones: false,
  deleteOnExpire: true,
});

export const IncidentAutocompletionCache = new NodeCache({
  stdTTL: 5,
  checkperiod: 5,
  useClones: false,
  deleteOnExpire: true,
});

export const CitationAutocompletionCache = new NodeCache({
  stdTTL: 10,
  checkperiod: 5,
  useClones: false,
  deleteOnExpire: true,
});

export const BookingAutocompletionCache = new NodeCache({
  stdTTL: 10,
  useClones: false,
  checkperiod: 5,
  deleteOnExpire: true,
});

export const RobloxQueryUsernameResultsCache = new NodeCache({
  stdTTL: 8,
  checkperiod: 4,
  useClones: false,
  deleteOnExpire: true,
});
