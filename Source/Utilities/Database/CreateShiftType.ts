import { Guilds } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";
import AppError from "../Classes/AppError.js";

/**
 * Creates a new shift type for the given guild
 * @param Data The shift type data
 * @returns The shift type after being saved if creation succeeded or an `AppError` instance if there was an exception (would be thrown if the exception was from the database)
 */
export default async function CreateShiftType(Data: Guilds.CreateShiftTypeConfig) {
  const GuildDoc = await GuildModel.findById(Data.guild_id)
    .select("settings.shift_management.shift_types")
    .exec();

  const ShiftTypeExists = GuildDoc?.settings.shift_management.shift_types.some(
    (ShiftType) => ShiftType.name === Data.name
  );

  if (!GuildDoc) {
    throw new AppError({
      template: "GuildConfigNotFound",
      showable: true,
    });
  }

  if (ShiftTypeExists) {
    return new AppError({
      template: "ShiftTypeAlreadyExists",
      showable: true,
    });
  } else if (GuildDoc.settings.shift_management.shift_types.length > 9) {
    return new AppError({
      template: "MaximumShiftTypesReached",
      showable: true,
    });
  } else {
    if (Data.is_default) {
      GuildDoc.settings.shift_management.shift_types.forEach((Type) => {
        Type.is_default = false;
      });
    }

    const Total = GuildDoc.settings.shift_management.shift_types.push({
      name: Data.name,
      is_default: Data.is_default,
      access_roles: Data.access_roles,
      created_on: Data.created_on,
    });

    return GuildDoc.save().then((Res) => {
      return Res.settings.shift_management.shift_types[Total - 1];
    });
  }
}
