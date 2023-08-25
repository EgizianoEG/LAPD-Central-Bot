const GuildModel = require("../../Models/Guild.js");
const AppError = require("../Classes/AppError.js");
// ----------------------------------------------------------------

/**
 * Creates a new shift type for the given guild ID
 * @param {GuildShiftType & {guild_id: string}} Data The shift type data: `name` and `permissible_roles`
 * @returns {Promise<import("mongoose").Document|AppError>} The saved guild document if creation succeeded or an `AppError` if there was an exception
 */
async function CreateShiftType(Data) {
  const GuildDoc = await GuildModel.findOne(
    { id: Data.guild_id },
    "settings.shift_settings.shift_types"
  ).exec();

  const ShiftTypeExists = GuildDoc.settings.shift_settings.shift_types.find(
    (ShiftType) => ShiftType.name === Data.name
  );

  if (!ShiftTypeExists) {
    if (GuildDoc.settings.shift_settings.shift_types.length > 9) {
      return new AppError(
        "Maximum Shift Types Reached",
        "The limit of ten shift types has been reached, and you cannot create further."
      );
    } else {
      GuildDoc.settings.shift_settings.shift_types.push({
        name: Data.name,
        permissible_roles: Data.permissible_roles,
      });
      return GuildDoc.save();
    }
  } else {
    return new AppError(
      "Shift Type Already Exists",
      `There is already a shift type named \`${Data.name}\`. Please make sure you're creating a distinct shift type.`
    );
  }
}

// ------------------------------
module.exports = CreateShiftType;
