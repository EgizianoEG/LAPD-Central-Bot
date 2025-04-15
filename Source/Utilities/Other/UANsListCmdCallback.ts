import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { TimestampStylesString, time as FormatTime } from "discord.js";

import Chunks from "@Utilities/Other/SliceIntoChunks.js";
import LeaveOfAbsenceModel from "@Models/UserActivityNotice.js";
import HandleEmbedPagination from "@Utilities/Other/HandleEmbedPagination.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
function SafeFormatTime<TStyle extends TimestampStylesString>(InputDate: Date, Style: TStyle) {
  return InputDate instanceof Date && !isNaN(InputDate.getTime())
    ? FormatTime(InputDate, Style)
    : "[Unknown Date]";
}

function FormaLOARecords(
  UANRecords: UserActivityNotice.UserActivityNoticeDocument[][],
  UANStatus: "Active" | "Pending",
  RecordsTotal: number,
  RecordsType: UserActivityNotice.NoticeType
) {
  const Pages: InfoEmbed[] = [];
  const RecordTypeText =
    RecordsType === "ReducedActivity" ? "reduced activity" : "leave of absence";
  const RecordTypeStrinAbbr = RecordsType === "ReducedActivity" ? "RA" : "Leave";

  for (const Chunk of UANRecords) {
    const Lines: string[] = [];
    for (const Notice of Chunk) {
      Lines.push(
        `<@${Notice.user}> \u{1680} ${SafeFormatTime(Notice[UANStatus === "Active" ? "end_date" : "request_date"], "F")}`
      );
    }

    Pages.push(
      new InfoEmbed()
        .setThumbnail(null)
        .setDescription(Lines.join("\n"))
        .setTitle(`${UANStatus} ${RecordTypeStrinAbbr} Notices — ${RecordsTotal}`)
        .setFooter({
          text: `Displaying all ${UANStatus.toLowerCase()} ${RecordTypeText} records in an ascending order of ${UANStatus === "Active" ? "end" : "request"} dates.`,
        })
    );
  }

  return Pages;
}

export default async function UANListCmdCallback(
  Interaction: SlashCommandInteraction<"cached">,
  RecordsType: UserActivityNotice.NoticeType
) {
  const RecordTypeText =
    RecordsType === "ReducedActivity" ? "reduced activity" : "leave of absence";
  const QueryFilter = { guild: Interaction.guildId, type: RecordsType, status: "Pending" };
  const DesiredStatus = (Interaction.options.getString("status", false) || "Active") as
    | "Active"
    | "Pending";

  if (DesiredStatus === "Active") {
    QueryFilter.status = "Approved";
    Object.assign(QueryFilter, { end_date: { $gt: Interaction.createdAt }, early_end_date: null });
  }

  const NoticeRecords = await LeaveOfAbsenceModel.find(QueryFilter, {
    user: 1,
    end_date: 1,
    request_date: 1,
  })
    .lean()
    .exec();

  if (NoticeRecords.length === 0) {
    if (DesiredStatus === "Active") {
      return new InfoEmbed()
        .useInfoTemplate("NoUANsWithActiveStatus", RecordTypeText)
        .replyToInteract(Interaction, true);
    }
    return new InfoEmbed()
      .useInfoTemplate("NoUANsWithSpecifiedStatus", RecordTypeText)
      .replyToInteract(Interaction, true);
  }

  const LOAsChunks = Chunks(NoticeRecords, 8);
  const Pages = FormaLOARecords(LOAsChunks, DesiredStatus, NoticeRecords.length, RecordsType);
  return HandleEmbedPagination(Pages, Interaction);
}
