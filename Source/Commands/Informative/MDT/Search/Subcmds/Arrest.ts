// Dependencies:
// -------------

import { MessageFlags, SlashCommandSubcommandBuilder } from "discord.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import GetArrestRecord from "@Utilities/Database/GetArrestRecord.js";
import GetFormattedArrestReportEmbed from "@Utilities/Other/FormatArrestReportEmbed.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(CmdInteraction: SlashCommandInteraction<"cached">) {
  const BookingNum = CmdInteraction.options.getInteger("booking-num", true);
  const ArrestRecord = await GetArrestRecord(CmdInteraction.guildId, BookingNum);
  if (!ArrestRecord) {
    return new ErrorEmbed()
      .useErrTemplate("ArrestRecordNotFound")
      .replyToInteract(CmdInteraction, true);
  }

  return CmdInteraction.reply({
    embeds: [await GetFormattedArrestReportEmbed(ArrestRecord)],
    flags: MessageFlags.Ephemeral,
  });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("arrest")
    .setDescription("Search for an arrest record.")
    .addIntegerOption((Option) =>
      Option.setName("booking-num")
        .setDescription("The booking number of the arrest.")
        .setMaxValue(99999)
        .setMinValue(1000)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
