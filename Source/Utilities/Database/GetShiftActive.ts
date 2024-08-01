import { Shifts } from "@Typings/Utilities/Database.js";
import { Falsey } from "utility-types";
import ShiftModel from "@Models/Shift.js";
import { ButtonInteraction } from "discord.js";

/**
 * Retrieves and returns the active shifts (with the input ShiftType or with all by default)
 * for a certain guild using the interaction data in the provided object and, if specified
 * (UserOnly option), the current active shift for the person who initiated the interaction.
 * @param param0 - Configuration options for the function.
 * @defaults All active shifts for the guild in which the interaction was initiated, including all shift types.
 * @example
 * const ShiftActive = require("../ShiftActive");
 * const CmdInteraction = ...
 * 
 * ShiftActive({ Interaction: CmdInteraction, ShiftType: ["Default", "Night"] }).then((Shifts) => {
    Shifts.forEach(async (Shift) => {
      console.log("Shift Started:", Shift.start_timestamp);
      console.log("Shift Type:", Shift.type);
      console.log("Ending...");
      await Shift.end();
    });
  });
 */
export default async function GetShiftActive<UOType extends boolean | undefined = false>({
  Interaction,
  ShiftType,
  UserOnly = false,
}: {
  /** Whether or not to return the active shift for the individual who initiated the interaction only. */
  UserOnly?: UOType;
  /** The types of duty shifts that will be retrieved; e.g. `"Default"`, `["Default", "Night Shift"]` */
  ShiftType?: null | string | string[];
  /** The received discord.js guild interaction */
  Interaction:
    | SlashCommandInteraction<"cached">
    | ButtonInteraction<"cached">
    | { user: { id: string }; guildId: string };
}): Promise<
  UOType extends Falsey ? Shifts.HydratedShiftDocument[] : Shifts.HydratedShiftDocument | null
> {
  const ActiveShifts = await ShiftModel.find({
    guild: Interaction.guildId,
    user: UserOnly ? Interaction.user.id : { $exists: true },
    type: ShiftType || { $exists: true },
    end_timestamp: null,
  }).exec();

  return (UserOnly ? (ActiveShifts[0] ?? null) : ActiveShifts) as any;
}
