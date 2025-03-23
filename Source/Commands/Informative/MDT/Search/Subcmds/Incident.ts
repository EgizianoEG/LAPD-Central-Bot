import { MessageFlags, SlashCommandSubcommandBuilder } from "discord.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import GetIncidentRecord from "@Utilities/Database/GetIncidentRecord.js";
import GetIncidentReportEmbeds from "@Utilities/Other/GetIncidentReportEmbeds.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(CmdInteraction: SlashCommandInteraction<"cached">) {
  const IncidentNum = CmdInteraction.options.getInteger("incident-num", true);
  const IncidentRecord = await GetIncidentRecord(CmdInteraction.guildId, IncidentNum);
  if (!IncidentRecord) {
    return new ErrorEmbed()
      .useErrTemplate("IncidentRecordNotFound")
      .replyToInteract(CmdInteraction, true);
  } else {
    await CmdInteraction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const ReportEmbeds = GetIncidentReportEmbeds(IncidentRecord, {
    channel_id: CmdInteraction.channelId,
  });

  return CmdInteraction.editReply({
    embeds: ReportEmbeds,
  });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("incident")
    .setDescription("Get information about a logged incident.")
    .addIntegerOption((Option) =>
      Option.setName("incident-num")
        .setDescription("The incident number.")
        .setMaxValue(999999)
        .setMinValue(100000)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
