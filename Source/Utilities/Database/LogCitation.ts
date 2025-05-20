import {
  ModalSubmitInteraction,
  ButtonInteraction,
  EmbedBuilder,
  userMention,
  Colors,
  time,
} from "discord.js";

import { CitationImgDimensions } from "../ImageRendering/GetFilledCitation.js";
import { SendGuildMessages } from "@Utilities/Other/GuildMessages.js";
import { GuildCitations } from "@Typings/Utilities/Database.js";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import { APIResponses } from "@Typings/Utilities/Roblox.js";

import Dedent from "dedent";
import AppError from "@Utilities/Classes/AppError.js";
import CitationModel from "@Models/Citation.js";
import UploadToImgBB from "../Other/ImgBBUpload.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";
import GetPlaceholderImgURL from "../Other/GetPlaceholderImg.js";
import IncrementActiveShiftEvent from "@Utilities/Database/IncrementActiveShiftEvent.js";

/**
 * Creates a traffic citation record on a specific guild.
 * @param CachedInteract - The interaction invoked the logging process.
 * @param CitationData - The citation data to be logged.
 * @param CitationImg - The filled citation as an image. A buffer to be uploaded or the image URL itself (if already uploaded.)
 * @returns - The logged citation message link (the main one) if successful.
 */
export default async function LogTrafficCitation(
  CachedInteract:
    | SlashCommandInteraction<"cached">
    | ButtonInteraction<"cached">
    | ModalSubmitInteraction<"cached">,
  CitationData: Omit<GuildCitations.AnyCitationData, "img_url">,
  CitationImg: string | Buffer,
  AdditionalViolatorInfo: APIResponses.Users.GetUserResponse
): Promise<string | null> {
  let CitationImgURL: string;
  if (typeof CitationImg === "string") {
    CitationImgURL = CitationImg;
  } else {
    const CurrentYearSuffix = CachedInteract.createdAt.getFullYear().toString().slice(-2);
    const CitType = CitationData.type.toLowerCase();

    CitationImgURL =
      (await UploadToImgBB(
        CitationImg,
        `traffic_citation_${CurrentYearSuffix}_${CitType}_#${CitationData.num}`
      )) ??
      GetPlaceholderImgURL(`${CitationImgDimensions.Width}x${CitationImgDimensions.Height}`, "?");
  }

  const GuildSettings = await GetGuildSettings(CachedInteract.guildId);
  const RecordedCitation = await CitationModel.create({
    ...CitationData,
    img_url: CitationImgURL,
  }).then((RecCit) => {
    IncrementActiveShiftEvent("citations", CachedInteract.user.id, CachedInteract.guildId).catch(
      () => null
    );

    return RecCit;
  });

  if (!RecordedCitation) {
    throw new AppError({ template: "DatabaseError", showable: true });
  }

  const CitationDescription = Dedent(`
    **Citation issued by:** ${userMention(RecordedCitation.citing_officer.discord_id)}
    **Issued on:** ${time(CitationData.issued_on, "f")}
    **Violator:** ${FormatUsername(AdditionalViolatorInfo, false, true)}
    **Number:** \`${CitationData.num}\`
  `);

  const CitationEmbed = new EmbedBuilder()
    .setTitle(`Traffic Citation — ${CitationData.type}`)
    .setDescription(CitationDescription)
    .setColor(Colors.DarkBlue)
    .setImage(CitationImgURL);

  if (GuildSettings?.duty_activities.log_channels.citations) {
    return SendGuildMessages(CachedInteract, GuildSettings.duty_activities.log_channels.citations, {
      embeds: [CitationEmbed],
    }).then((SentMessage) => SentMessage?.url ?? null);
  }

  return null;
}
