import { ExtraTypings } from "@Typings/Utilities/Database.js";
import GuildModel from "@Models/Guild.js";
import AppError from "../Classes/AppError.js";

/**
 * Creates a new shift type for the given guild
 * @param Data The shift type data
 * @returns The shift type after being saved if creation succeeded or an `AppError` instance if there was an exception (would be thrown if the exception was from the database)
 */
export default async function CreateShiftType(Data: ExtraTypings.CreateShiftTypeConfig) {
  const GuildDoc = await GuildModel.findById(Data.guild_id).select("settings.shifts.types").exec();
  const ShiftTypeExists = GuildDoc?.settings.shifts.types.some(
    (ShiftType) => ShiftType.name === Data.name
  );

  if (!GuildDoc) {
    throw new AppError({
      Title: "Database Error",
      Message: `Couldn't find the guild document for guild id:${Data.guild_id}`,
      Showable: true,
    });
  }

  if (ShiftTypeExists) {
    return new AppError({
      Title: "Shift Type Already Exists",
      Message: `A shift type with the name \`${Data.name}\` does already exist. Please make sure you're creating a distinct shift type.`,
      Showable: true,
    });
  } else if (GuildDoc.settings.shifts.types.length > 9) {
    return new AppError({
      Title: "Maximum Shift Types Reached",
      Message: "The limit of ten shift types has been reached, and you cannot create any further.",
      Showable: true,
    });
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
