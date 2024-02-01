import { BaseInteraction, GuildMember, PermissionFlagsBits } from "discord.js";
import { UserPermsCache, DBRolePermsCache } from "../Other/Cache.js";
import { IsPlainObject, IsEmptyObject } from "../Other/Validators.js";
import { App as Client } from "@DiscordApp";
import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { DeepPartial } from "utility-types";
import GuildModel from "@Models/Guild.js";

/**
 * Checks if a user has the required permissions based on the provided permissions configuration.
 * @param CmdInteraction - The user command interaction to process.
 * @param Perms - Permissions to validate against.
 * @returns A `Promise` that resolves to a boolean value.
 */
export default async function UserHasPerms(
  CmdInteraction: BaseInteraction<"cached">,
  Perms: DeepPartial<ExtraTypings.UserPermissionsConfig>
): Promise<boolean> {
  if (!IsPlainObject(Perms) || IsEmptyObject(Perms)) return true;
  if (Object.values(Perms).every((Val) => !Val)) return true;

  return CheckPerms(await GetDBRolePerms(CmdInteraction.guildId), Perms, CmdInteraction.member);
}

/**
 * Checks if a user or multiple users have specific permissions in a guild.
 * @param {string | string[]} User - Can be either a string or an array of strings. It represents the user or users for whom the permissions need to be checked.
 * @param {string} GuildId - A string that represents the ID of the guild (server) where the user's permissions will be checked.
 * @param {ExtraTypings.UserPermissionsConfig} Perms - Represents the permissions that the user should have.
 * @param {boolean} [UseCache=false] - A boolean flag that determines whether to use the cache for retrieving user permissions (if available); default: `false`
 * @returns A `Promise` that resolves to a boolean value or a record of boolean values if `User` is an array.
 */
export async function UserHasPermsV2<UType extends string | string[]>(
  User: UType,
  GuildId: string,
  Perms: DeepPartial<ExtraTypings.UserPermissionsConfig>,
  UseCache: boolean = false
): Promise<UType extends string ? boolean : Record<string, boolean>> {
  if (!IsPlainObject(Perms) || IsEmptyObject(Perms) || Object.values(Perms).every((Val) => !Val)) {
    if (Array.isArray(User)) {
      return User.reduce((Acc, UserId) => {
        Acc[UserId] = true;
        return Acc;
      }, {}) as any;
    } else {
      return true as any;
    }
  }

  if (UseCache && typeof User === "string") {
    const Cached = UserPermsCache.get(`${GuildId}:${User}:${Perms}`);
    if (typeof Cached === "boolean") return Cached as any;
  }

  const Guild = Client.guilds.cache.get(GuildId);
  if (typeof User === "string") {
    const GuildMember = Guild?.members.cache.get(User);
    if (!GuildMember) return false as any;

    const Result = CheckPerms(await GetDBRolePerms(GuildId, UseCache), Perms, GuildMember);
    UserPermsCache.set(`${GuildId}:${User}:${Perms}`, Result);
    return Result as any;
  } else if (Array.isArray(User)) {
    const Result = {};
    for (const UserId of User) {
      if (UseCache) {
        const Cached = UserPermsCache.get(`${GuildId}:${UserId}:${Perms}`);
        if (typeof Cached === "boolean") {
          Result[UserId] = Cached;
          continue;
        }
      }

      const GuildMember = Guild?.members.cache.get(UserId);
      if (!GuildMember) {
        Result[UserId] = false;
        continue;
      }

      Result[UserId] = CheckPerms(await GetDBRolePerms(GuildId, UseCache), Perms, GuildMember);
      UserPermsCache.set(`${GuildId}:${User}:${Perms}`, Result[UserId]);
    }

    return Result as any;
  } else {
    return false as any;
  }
}

// ---------------------------------------------------------------------------------------
// Local Utilities:
// ----------------
type DBRolePermsType = {
  staff: string[];
  management: string[];
};

/**
 * Determines whether the given object has a logical operation of "and" or "or".
 * @param Obj - An object that can have two properties: `and`, `or`. These properties are optional and can be of type boolean.
 * @returns Either "and" or "or" based on the presence of the properties in the input object. If neither `'and'` nor `'or'` is present, the function will default to returning "and".
 */
function GetLogicalOperation(Obj: object & { $and?: boolean; $or?: boolean }): "and" | "or" {
  if (Obj.$and) return "and";
  else if (Obj.$or) return "or";
  else return "and";
}

/**
 * Retrieves role permissions for a guild from a database, with an option to use a cache.
 * @param {string} GuildId - A string representing the ID of the guild (server).
 * @param {boolean} [UseCache=false] - A boolean that determines whether to use the cache or not.
 * @returns
 */
async function GetDBRolePerms(
  GuildId: string,
  UseCache: boolean = false
): Promise<DBRolePermsType> {
  if (UseCache && DBRolePermsCache.has(GuildId)) {
    return DBRolePermsCache.get(GuildId) as DBRolePermsType;
  }

  return GuildModel.findById(GuildId)
    .select({ settings: { role_perms: 1 } })
    .then((GuildData) => {
      if (GuildData) {
        DBRolePermsCache.set(GuildId, GuildData.settings.role_perms);
        return GuildData.settings.role_perms;
      }
      throw new Error(`Could not find a guild with the ID '${GuildId}' in the database.`);
    });
}

/**
 * Checks if a guild member has staff or management permissions based on their roles and guild permissions.
 * @param {DBRolePermsType} DBRolePerms
 * @param {DeepPartial<ExtraTypings.UserPermissionsConfig>} Perms
 * @param {GuildMember} GuildMember
 * @returns a boolean value, either true or false.
 */
function CheckPerms(
  DBRolePerms: DBRolePermsType,
  Perms: DeepPartial<ExtraTypings.UserPermissionsConfig>,
  GuildMember: GuildMember
): boolean {
  let HasStaff = false;
  let HasManagement = false;

  if (Perms.management) {
    if (typeof Perms.management === "boolean") {
      if (
        Perms.management &&
        (GuildMember.permissions.has(PermissionFlagsBits.ManageGuild) ||
          GuildMember.roles.cache.hasAny(...DBRolePerms.management))
      ) {
        HasManagement = true;
      }
    } else if (Perms.management.guild && Perms.management.app) {
      const logicalOperation = GetLogicalOperation(Perms.management);

      if (
        logicalOperation === "and" &&
        GuildMember.roles.cache.hasAny(...DBRolePerms.management) &&
        GuildMember.permissions.has(PermissionFlagsBits.ManageGuild)
      ) {
        HasManagement = true;
      }

      if (
        logicalOperation === "or" &&
        (GuildMember.roles.cache.hasAny(...DBRolePerms.management) ||
          GuildMember.permissions.has(PermissionFlagsBits.ManageGuild))
      ) {
        HasManagement = true;
      }
    } else {
      throw new Error(`Invalid 'management' object structure; ${String(Perms.management)}`);
    }
  }

  if (
    Perms.staff &&
    typeof Perms.staff === "boolean" &&
    (GuildMember.permissions.has(PermissionFlagsBits.ManageGuild) ||
      GuildMember.roles.cache.hasAny(...DBRolePerms.staff))
  ) {
    HasStaff = true;
  }

  if (Perms.$and) {
    return HasManagement && HasStaff;
  } else {
    return HasStaff || HasManagement;
  }
}
