import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  SlashCommandSubcommandBuilder,
  TimestampStylesString,
  time as FormatTime,
} from "discord.js";

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
  LOARecords: UserActivityNotice.UserActivityNoticeDocument[][],
  LOAStatus: "Active" | "Pending",
  RecordsTotal: number
) {
  const Pages: InfoEmbed[] = [];
  for (const Chunk of LOARecords) {
    const Lines: string[] = [];
    for (const LOA of Chunk) {
      Lines.push(
        `<@${LOA.user}> \u{1680} ${SafeFormatTime(LOA[LOAStatus === "Active" ? "end_date" : "request_date"], "F")}`
      );
    }

    Pages.push(
      new InfoEmbed()
        .setThumbnail(null)
        .setDescription(Lines.join("\n"))
        .setTitle(`${LOAStatus} Leave Notices — ${RecordsTotal}`)
        .setFooter({
          text: `Displaying all ${LOAStatus.toLowerCase()} LOAs in an ascending order of ${LOAStatus === "Active" ? "end" : "request"} dates.`,
        })
    );
  }

  return Pages;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const QueryFilter = { guild: Interaction.guildId, status: "Pending" };
  const DesiredStatus = (Interaction.options.getString("status", false) || "Active") as
    | "Active"
    | "Pending";

  if (DesiredStatus === "Active") {
    QueryFilter.status = "Approved";
    Object.assign(QueryFilter, { end_date: { $gt: Interaction.createdAt }, early_end_date: null });
  }

  const LeaveRecords = await LeaveOfAbsenceModel.find(QueryFilter, {
    user: 1,
    end_date: 1,
    request_date: 1,
  })
    .lean()
    .exec();

  if (LeaveRecords.length === 0) {
    if (DesiredStatus === "Active") {
      return new InfoEmbed()
        .useInfoTemplate("NoLOAsWithActiveStatus")
        .replyToInteract(Interaction, true);
    }
    return new InfoEmbed()
      .useInfoTemplate("NoLOAsWithSpecifiedStatus")
      .replyToInteract(Interaction, true);
  }

  const LOAsChunks = Chunks(LeaveRecords, 8);
  const Pages = FormaLOARecords(LOAsChunks, DesiredStatus, LeaveRecords.length);
  return HandleEmbedPagination(Pages, Interaction);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("list")
    .setDescription("Displays the server's leave of absence records with a specified status.")
    .addStringOption((Option) =>
      Option.setName("status")
        .setDescription(
          "The status of the LOA records to be displayed, either active or pending; defaults to “Active.”"
        )
        .setChoices({ name: "Active", value: "Active" }, { name: "Pending", value: "Pending" })
        .setRequired(false)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
