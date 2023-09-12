const GuildModel = require("../../Models/Guild");
const { PermissionFlagsBits } = require("discord.js");
const { IsPlainObject, IsEmptyObject } = require("../Other/Validator");
// ----------------------------------------------------------------------

/**
 * Returns the logical operation name to be made on an object
 * @param {unknown & { $and?: boolean, $or?: boolean }} Obj
 * @returns {"and"|"or"}
 */
function GetLogicalOperation(Obj) {
  if (Obj.$and) return "and";
  else if (Obj.$or) return "or";
  else return "and";
}

/**
 * Checks if a given user is already logged in using the bot.
 * @param {DiscordJS.BaseInteraction<"cached">} CmdInteraction - The user command interaction to process.
 * @param {Utilities.Database.UserPermissionsData} Perms - Permissions object to validate against
 * @returns {Promise<Boolean>}
 */
async function UserHasPerms(CmdInteraction, Perms) {
  if (!IsPlainObject(Perms) || IsEmptyObject(Perms)) return true;
  if (Object.values(Perms).every((Val) => !Val)) return true;

  const GuildMember = CmdInteraction.member;
  const DBRolePerms = await GuildModel.findById(CmdInteraction.guildId)
    .select({ settings: { role_perms: 1 } })
    .then((GuildData) => {
      if (GuildData) return GuildData.settings.role_perms;
      throw new Error(`Could not find "${CmdInteraction.guildId}" guild in the database.`);
    });

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
      throw new Error(`Invalid 'management' object structure; ${Perms.management}`);
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

  return HasStaff || HasManagement;
}

// ---------------------------
module.exports = UserHasPerms;
