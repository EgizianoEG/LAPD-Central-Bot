/* eslint indent: ["off", 2, { "ObjectExpression": 1 }] */
// Dependencies:
// -------------

import { SlashCommandBuilder, AutocompleteInteraction } from "discord.js";
import { ErrorMessages } from "@Resources/AppMessages.js";
import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import AutocompleteUsername from "@Utilities/Autocompletion/Username.js";
import AutocompleteVehicle from "@Utilities/Autocompletion/Vehicle.js";
import AutocompleteHeight from "@Utilities/Autocompletion/Height.js";
import AutocompleteWeight from "@Utilities/Autocompletion/Weight.js";
import AutocompleteColor from "@Utilities/Autocompletion/Color.js";
import GetRobloxUserLinked from "@Utilities/Database/IsUserLoggedIn.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";

const Subcommands = [
  (await import("./Deps/CitFine.js")).default,
  (await import("./Deps/CitWarn.js")).default,
  (await import("./Deps/Arrest.js")).default,
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Validates an interaction before the command is executed.
 * @param Interaction - The interaction to validate.
 * @returns If the interaction was handled, returns an object with `RobloxId`
 * and `ActiveShift` for additional processing; otherwise returns `false`.
 */
async function HandleInteractValidation(Interaction: SlashCommandInteraction<"cached">) {
  const HasRobloxLinked = await GetRobloxUserLinked(Interaction);
  let IsHandled = false;

  if (!HasRobloxLinked) {
    IsHandled = true;
    await new ErrorEmbed()
      .setTitle(ErrorMessages.RobloxUserNotLinked.Title)
      .setDescription(ErrorMessages.RobloxUserNotLinked.Description)
      .replyToInteract(Interaction, true, true);
  }

  const HasActiveShift = await GetShiftActive({ Interaction, UserOnly: true });
  // Validation for shift active yet to be implemented once the shift system is 100% functional and ready.
  // if (!HasActiveShift) {
  //   IsHandled = true;
  //   await new ErrorEmbed()
  //     .setTitle(ErrorMessages.ShiftMustBeActive.Title)
  //     .setDescription(ErrorMessages.ShiftMustBeActive.Description)
  //     .replyToInteract(Interaction, true, true);
  // }

  return IsHandled
    ? null
    : {
        RobloxUserId: HasRobloxLinked,
        ActiveShift: HasActiveShift,
      };
}

/**
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const UserData = await HandleInteractValidation(Interaction);
  if (!UserData) return;
  for (const Subcommand of Subcommands) {
    if (Subcommand.data.name === Interaction.options.getSubcommand()) {
      if (typeof Subcommand.callback === "function") {
        return Subcommand.callback(Interaction, UserData);
      } else {
        break;
      }
    }
  }
}

/**
 * @param Interaction
 * @returns
 */
async function Autocomplete(Interaction: AutocompleteInteraction) {
  const { name, value } = Interaction.options.getFocused(true);
  let Suggestions: { name: string; value: string }[] = [];

  if (name === "name") {
    Suggestions = await AutocompleteUsername(value);
  } else if (name === "height") {
    Suggestions = AutocompleteHeight(value);
  } else if (name === "weight") {
    Suggestions = AutocompleteWeight(value);
  } else if (name === "color" || name === "vehicle-color") {
    Suggestions = AutocompleteColor(value);
  } else if (name === "vehicle" || name === "vehicle-model") {
    Suggestions = AutocompleteVehicle(value);
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<any> = {
  options: { cooldown: 10 },
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Logs a particular information into the database.")
    .setDMPermission(false)
    .addSubcommand(Subcommands[0].data)
    .addSubcommand(Subcommands[1].data)
    .addSubcommand(Subcommands[2].data),

  callback: Callback,
  autocomplete: Autocomplete,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
export interface ReporterInfo {
  ActiveShift: ExtraTypings.HydratedShiftDocument | null;
  RobloxUserId: number;
}
