// Dependencies:
// -------------

import { SlashCommandSubcommandBuilder } from "discord.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(_CmdInteraction: SlashCommandInteraction<"cached">) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("incident")
    .setDescription("Search for a logged incident.")
    .addIntegerOption((Option) =>
      Option.setName("incident-num")
        .setDescription("The incident number.")
        .setMaxValue(99999)
        .setMinValue(1000)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
