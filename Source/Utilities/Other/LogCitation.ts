import { HydratedDocumentFromSchema } from "mongoose";
import { Colors, EmbedBuilder, time } from "discord.js";
import { Citations } from "@Typings/Utilities/Generic.js";

import SendGuildMessages from "@Utilities/Other/SendGuildMessages.js";
import GuildModel from "@Models/Guild.js";
import Dedent from "dedent";

/**
 * Creates a traffic citation record on a specific guild.
 * @param CitationType - The type of citation being processed.
 * @param CachedInteract - The first interaction received; i.e. the command interaction.
 * @param ModalSubmission - The modal submission of the last needed information.
 * @param CitingOfficer - The officer who is issuing the citation.
 * @param PartialCitationData - The incomplete citation data to process.
 * @returns - The logged citation message link (the main one) if successful.
 */
export default async function LogTrafficCitation(
  CitationType: Citations.CitationType,
  CachedInteract: SlashCommandInteraction<"cached">,
  GuildDocument: HydratedDocumentFromSchema<typeof GuildModel.schema>,
  CitationData: Citations.AnyCitationData,
  CitationImgURL: string
) {
  GuildDocument.logs.citations.addToSet({ ...CitationData, issued_at: CachedInteract.createdAt });
  await GuildDocument.save();

  const CitationDescription = Dedent(`
    **Citation issued by:** <@${CachedInteract.user.id}>
    **Issued on:** ${time(CachedInteract.createdAt, "f")}
    **Number:** \`${CitationData.num}\`
  `);

  const CitationEmbed = new EmbedBuilder()
    .setTitle(`Traffic Citation — ${CitationType}`)
    .setDescription(CitationDescription)
    .setColor(Colors.DarkBlue)
    .setImage(CitationImgURL);

  return SendGuildMessages(CachedInteract, GuildDocument.settings.log_channels.citations, {
    embeds: [CitationEmbed],
  });
}
