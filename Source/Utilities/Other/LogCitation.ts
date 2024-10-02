import { HydratedDocumentFromSchema } from "mongoose";
import { Colors, EmbedBuilder, time } from "discord.js";
import { CitationImgDimensions } from "./GetFilledCitation.js";
import { SendGuildMessages } from "@Utilities/Other/GuildMessages.js";
import { Citations } from "@Typings/Utilities/Generic.js";

import Dedent from "dedent";
import UploadToImgBB from "./ImgBBUpload.js";
import GetPlaceholderImgURL from "./GetPlaceholderImg.js";
import IncrementActiveShiftEvent from "@Utilities/Database/IncrementActiveShiftEvent.js";

/**
 * Creates a traffic citation record on a specific guild.
 * @param CitationType - The type of citation being processed.
 * @param CachedInteract - The first interaction received; i.e. the command interaction.
 * @param GuildDocument
 * @param CitationData
 * @param CitationImg - The filled citation as an image. A buffer to be uploaded or the image URL itself (if already uploaded.)
 * @returns - The logged citation message link (the main one) if successful.
 */
export default async function LogTrafficCitation(
  CitationType: Citations.CitationType,
  CachedInteract: SlashCommandInteraction<"cached">,
  GuildDocument: HydratedDocumentFromSchema<typeof import("../../Models/Guild.js").default.schema>,
  CitationData: Omit<Citations.AnyCitationData, "img_url">,
  CitationImg: string | Buffer
) {
  let CitationImgURL: string;
  if (CitationImg instanceof Buffer) {
    CitationImgURL =
      (await UploadToImgBB(CitationImg, `traffic_citation_#${CitationData.num}`)) ??
      GetPlaceholderImgURL(`${CitationImgDimensions.Width}x${CitationImgDimensions.Height}`, "?");
  } else {
    CitationImgURL = CitationImg;
  }

  GuildDocument.logs.citations.addToSet({
    ...CitationData,
    issued_on: CachedInteract.createdAt,
    img_url: CitationImgURL,
  });

  await Promise.all([
    GuildDocument.save(),
    IncrementActiveShiftEvent("citations", CachedInteract.user.id, GuildDocument._id).catch(
      () => null
    ),
  ]);

  const CitationDescription = Dedent(`
    **Citation issued by:** <@${CachedInteract.user.id}>
    **Issued on:** ${time(CachedInteract.createdAt, "f")}
    **Violator:** ${CitationData.violator.name}
    **Number:** \`${CitationData.num}\`
  `);

  const CitationEmbed = new EmbedBuilder()
    .setTitle(`Traffic Citation — ${CitationType}`)
    .setDescription(CitationDescription)
    .setColor(Colors.DarkBlue)
    .setImage(CitationImgURL);

  return SendGuildMessages(
    CachedInteract,
    GuildDocument.settings.duty_activities.log_channels.citations,
    {
      embeds: [CitationEmbed],
    }
  );
}
