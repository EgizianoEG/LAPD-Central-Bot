import { SlashCommandSubcommandBuilder } from "discord.js";
import type { ReporterInfo } from "../Log.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param Interaction
 * @param UserData
 */
async function CmdCallback(
  Interaction: SlashCommandInteraction<"cached">,
  UserData: ReporterInfo
) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: CmdCallback,
  data: new SlashCommandSubcommandBuilder()
    .setName("citation-fine")
    .setDescription("Creates a fine citation record for a person.")

    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The username of the violator.")
        .setRequired(true)
        .setMaxLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
    )
    .addIntegerOption((Option) =>
      Option.setName("fine-amount")
        .setDescription("The amount of the fine in US dollars.")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(200)
    )
    .addStringOption((Option) =>
      Option.setName("fine-reason")
        .setDescription("The reason for the fine given.")
        .setMinLength(5)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-plate")
        .setDescription("The license plate of the violator's car.")
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
        .setMaxLength(15)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
