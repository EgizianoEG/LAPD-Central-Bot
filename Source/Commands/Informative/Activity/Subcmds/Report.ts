// Dependencies:
// -------------
import { SlashCommandSubcommandBuilder } from "discord.js";
import { formatDistance, isAfter } from "date-fns";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import * as Chrono from "chrono-node";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
async function Callback(_CmdInteraction: SlashCommandInteraction<"cached">) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandBuilder> = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("report")
    .setDescription("Creates a report detailing officers' activities over a specific time period.")
    .addStringOption((Option) =>
      Option.setName("since")
        .setDescription(
          "A specific date, timeframe, or relative time expression to report on activity since then."
        )
        .setMinLength(2)
        .setMaxLength(40)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("time-requirement")
        .setDescription(
          "The on-duty shift time requirement for each officer. This requirement is disabled by default."
        )
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
    )
    .addStringOption((Option) =>
      Option.setName("shift-type")
        .setDescription(
          "The shift type to be reported on. If not specified, the report will encompass all types of shifts."
        )
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
