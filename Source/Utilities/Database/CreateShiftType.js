const GuildModel = require("../../Models/Guild.js");
const AppError = require("../Classes/AppError.js");
// ----------------------------------------------------------------

/**
 * Creates a new shift type for the given guild ID
 * @param {{guild_id: string, is_default?: boolean, name: string, permissible_roles: string[] }} Data The shift type data: `name` and `permissible_roles`
 * @returns {Promise<import("mongoose").Document|AppError>} The saved guild document if creation succeeded or an `AppError` if there was an exception
 */
async function CreateShiftType(Data) {
  const GuildDoc = await GuildModel.findById(Data.guild_id, "settings.shifts.types").exec();
  const ShiftTypeExists = GuildDoc.settings.shifts.types.find(
    (ShiftType) => ShiftType.name === Data.name
  );

  if (ShiftTypeExists) {
    return new AppError(
      "Shift Type Already Exists",
      `There is already a shift type named \`${Data.name}\`. Please make sure you're creating a distinct shift type.`
    );
  } else if (GuildDoc.settings.shifts.types.length > 9) {
    return new AppError(
      "Maximum Shift Types Reached",
      "The limit of ten shift types has been reached, and you cannot create any further."
    );
  } else {
    if (Data.is_default) {
      GuildDoc.settings.shifts.types.forEach((Type) => {
        Type.is_default = false;
      });
    }

    GuildDoc.settings.shifts.types.push({
      name: Data.name,
      is_default: Data.is_default,
      permissible_roles: Data.permissible_roles,
    });

    return GuildDoc.save();
  }
}

// ------------------------------
module.exports = CreateShiftType;
