import { ButtonInteraction, Colors, EmbedBuilder, ModalSubmitInteraction, time } from "discord.js";
import { GuildCitations, Guilds } from "@Typings/Utilities/Database.js";
import { CitationImgDimensions } from "./GetFilledCitation.js";
import { SendGuildMessages } from "@Utilities/Other/GuildMessages.js";

import Dedent from "dedent";
import GuildModel from "@Models/Guild.js";
import UploadToImgBB from "./ImgBBUpload.js";
import GetPlaceholderImgURL from "./GetPlaceholderImg.js";
import IncrementActiveShiftEvent from "@Utilities/Database/IncrementActiveShiftEvent.js";

/**
 * Creates a traffic citation record on a specific guild.
 * @param CachedInteract - The interaction invoked the logging process.
 * @param GuildDocument - The guild document object. ``
 * @param CitationData
 * @param CitationImg - The filled citation as an image. A buffer to be uploaded or the image URL itself (if already uploaded.)
 * @returns - The logged citation message link (the main one) if successful.
 */
export default async function LogTrafficCitation(
  CachedInteract:
    | SlashCommandInteraction<"cached">
    | ButtonInteraction<"cached">
    | ModalSubmitInteraction<"cached">,
  GuildDocument: Guilds.GuildDocument,
  CitationData: Omit<GuildCitations.AnyCitationData, "img_url">,
  CitationImg: string | Buffer
): Promise<string | null> {
  let CitationImgURL: string;
  if (typeof CitationImg === "string") {
    CitationImgURL = CitationImg;
  } else {
    CitationImgURL =
      (await UploadToImgBB(CitationImg, `traffic_citation_#${CitationData.num}`)) ??
      GetPlaceholderImgURL(`${CitationImgDimensions.Width}x${CitationImgDimensions.Height}`, "?");
  }

  await GuildModel.updateOne(
    {
      _id: CachedInteract.guildId,
    },
    {
      $addToSet: {
        "logs.citations": { ...CitationData, img_url: CitationImgURL },
      },
    }
  )
    .exec()
    .then((UpdateRes) => {
      if (UpdateRes.matchedCount > 0 && UpdateRes.acknowledged) {
        IncrementActiveShiftEvent("citations", CachedInteract.user.id, GuildDocument._id).catch(
          () => null
        );
      }
    });

  const CitationDescription = Dedent(`
    **Citation issued by:** <@${CitationData.citing_officer.discord_id}>
    **Issued on:** ${time(CitationData.issued_on, "f")}
    **Violator:** ${CitationData.violator.name}
    **Number:** \`${CitationData.num}\`
  `);

  const CitationEmbed = new EmbedBuilder()
    .setTitle(`Traffic Citation — ${CitationData.type}`)
    .setDescription(CitationDescription)
    .setColor(Colors.DarkBlue)
    .setImage(CitationImgURL);

  if (GuildDocument.settings?.duty_activities?.log_channels?.citations) {
    return SendGuildMessages(
      CachedInteract,
      GuildDocument.settings.duty_activities.log_channels.citations,
      {
        embeds: [CitationEmbed],
      }
    );
  }

  return null;
}
