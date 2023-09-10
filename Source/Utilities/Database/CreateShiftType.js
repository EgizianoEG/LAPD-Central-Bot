const GuildModel = require("../../Models/Guild.js");
const AppError = require("../Classes/AppError.js");
// ----------------------------------------------------------------

/**
 * Creates a new shift type for the given guild
 * @param {{
 *   name: string,
 *   guild_id: string,
 *   is_default?: boolean,
 *   permissible_roles?: string[]
 * }} Data The shift type data
 * @returns The shift type after being saved if creation succeeded or an `AppError` instance if there was an exception (would be thrown if the exception was from the database)
 */
async function CreateShiftType(Data) {
  const GuildDoc = await GuildModel.findById(Data.guild_id, "settings.shifts.types").exec();
  const ShiftTypeExists = GuildDoc?.settings.shifts.types.find(
    (ShiftType) => ShiftType.name === Data.name
  );

  if (!GuildDoc) {
    throw new AppError(
      "Database Error",
      `Couldn't find the guild document for guild id:${Data.guild_id}`
    );
  }

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

    const Total = GuildDoc.settings.shifts.types.push({
      name: Data.name,
      is_default: Data.is_default,
      permissible_roles: Data.permissible_roles,
    });

    return GuildDoc.save().then((Res) => {
      return Res.settings.shifts.types[Total - 1];
    });
  }
}

// ------------------------------
module.exports = CreateShiftType;
