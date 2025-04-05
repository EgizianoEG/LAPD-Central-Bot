import { GetFilledCitation } from "@Utilities/Other/GetFilledCitation.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  SlashCommandSubcommandBuilder,
  EmbedBuilder,
  MessageFlags,
  userMention,
  Colors,
  time,
} from "discord.js";

import GetCitationRecord from "@Utilities/Database/GetCitRecord.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(CmdInteraction: SlashCommandInteraction<"cached">) {
  const CitationNum = CmdInteraction.options.getInteger("citation-num", true);
  const CitationRecord = await GetCitationRecord(CmdInteraction.guildId, CitationNum);
  if (!CitationRecord) {
    return new ErrorEmbed()
      .useErrTemplate("CitRecordNotFound")
      .replyToInteract(CmdInteraction, true);
  } else {
    await CmdInteraction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const PrintedCitationImg =
    CitationRecord.img_url ?? (await GetFilledCitation(CitationRecord, true));

  const RespEmbedDesc = Dedent(`
    **Citation issued by:** ${userMention(CitationRecord.citing_officer.discord_id)}
    **Issued on:** ${time(CitationRecord.issued_on, "f")}
    **Number:** \`${CitationRecord.num}\`
  `);

  const ResponseEmbed = new EmbedBuilder()
    .setTitle(`Traffic Citation — ${CitationRecord.type}`)
    .setDescription(RespEmbedDesc)
    .setImage(PrintedCitationImg)
    .setColor(Colors.DarkBlue);

  return CmdInteraction.editReply({
    embeds: [ResponseEmbed],
  });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("citation")
    .setDescription("See a copy of an issued traffic citation.")
    .addIntegerOption((Option) =>
      Option.setName("citation-num")
        .setDescription("The citation number.")
        .setMaxValue(999999)
        .setMinValue(1000)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
