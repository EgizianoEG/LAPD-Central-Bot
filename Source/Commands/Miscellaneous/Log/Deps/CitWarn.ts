// Dependencies:
// -------------
import { SlashCommandSubcommandBuilder } from "discord.js";
import { EyeColors, HairColors } from "@Resources/ERLCPDColors.js";
import { ReporterInfo } from "../Log.js";

import ERLCAgeGroups from "@Resources/ERLCAgeGroups.js";
import AnyCitationCallback from "./Funcs/AnyCitationHandler.js";

const CmdFileLabel = "Commands:Miscellaneous:Log:CitWarn";
const EyeColorChoices = EyeColors.map((Color) => {
  return { name: `${Color.name} (${Color.abbreviation})`, value: Color.abbreviation };
});

const HairColorChoices = HairColors.map((Color) => {
  return { name: `${Color.name} (${Color.abbreviation})`, value: Color.abbreviation };
});

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param Interaction
 * @param UserData
 */
async function CitWrnCmdCallback(
  Interaction: SlashCommandInteraction<"cached">,
  CitingOfficer: ReporterInfo
) {
  return AnyCitationCallback(Interaction, CitingOfficer, CmdFileLabel);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: CitWrnCmdCallback,
  data: new SlashCommandSubcommandBuilder()
    .setName("citation-warning")
    .setDescription("Creates and logs a traffic warning citation record for a person.")

    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The username of the violator.")
        .setRequired(true)
        .setMaxLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
    )
    .addStringOption((Option) =>
      Option.setName("gender")
        .setDescription("The gender of the violator; either male or female.")
        .setRequired(true)
        .setChoices({ name: "Male", value: "Male" }, { name: "Female", value: "Female" })
    )
    .addIntegerOption((Option) =>
      Option.setName("age")
        .setDescription("The violator's age group as stated in the license.")
        .setRequired(true)
        .setChoices(...ERLCAgeGroups)
    )
    .addStringOption((Option) =>
      Option.setName("height")
        .setDescription("The violator's height in feet and inches.")
        .setMinLength(4)
        .setMaxLength(5)
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((Option) =>
      Option.setName("weight")
        .setDescription("The violator's weight in pounds (lbs).")
        .setMinValue(25)
        .setMaxValue(700)
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((Option) =>
      Option.setName("eye-color")
        .setDescription("The violator's eye color.")
        .setMinLength(3)
        .setMaxLength(14)
        .setRequired(true)
        .setChoices(...EyeColorChoices)
    )
    .addStringOption((Option) =>
      Option.setName("hair-color")
        .setDescription("The violator's hair color.")
        .setMinLength(3)
        .setMaxLength(14)
        .setRequired(true)
        .setChoices(...HairColorChoices)
    )
    .addIntegerOption((Option) =>
      Option.setName("license-num")
        .setDescription("The violator's driving license number.")
        .setMinValue(99999999)
        .setMaxValue(999999999999)
        .setRequired(true)
    )
    .addBooleanOption((Option) =>
      Option.setName("commercial-lic")
        .setDescription("Whether the driving license is commercial or not.")
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-plate")
        .setDescription("The license plate of the violator's vehicle.")
        .setMinLength(3)
        .setMaxLength(7)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-model")
        .setDescription("The model of the violator's vehicle.")
        .setMinLength(5)
        .setMaxLength(100)
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-color")
        .setDescription("The color of the violator's vehicle.")
        .setMinLength(3)
        .setMaxLength(30)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ----------------------------------------------------------------
export default CommandObject;
