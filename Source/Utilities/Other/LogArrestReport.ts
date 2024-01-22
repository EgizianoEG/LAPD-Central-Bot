import { ButtonInteraction, Colors, EmbedBuilder, userMention } from "discord.js";
import { CmdOptionsType } from "@Cmds/Miscellaneous/Log/Deps/Arrest.js";
import { FormatUsername } from "@Utilities/Strings/Formatter.js";
import { Images, Icons } from "@Config/Shared.js";
import { ExtraTypings } from "@Typings/Utilities/Database.js";

import Dedent from "dedent";
import GuildModel from "@Models/Guild.js";
import SendGuildMessages from "@Utilities/Other/SendGuildMessages.js";
const ListFormatter = new Intl.ListFormat("en");

export type ReporterInfoType = {
  /** Shift currently active for the reporting officer */
  ShiftActive: ExtraTypings.HydratedShiftDocument | null;

  /** Arresting/Reporting officer's Discord Id */
  DiscordUserId: string;

  /** Discord Ids of the arrest assisting officers if applicable */
  AsstOfficers?: string[];

  /** The date of the report/arrest; defaults to the CMD interaction created at date */
  ReportDate?: Date;

  /** Arresting/Reporting officer's roblox user details */
  RobloxUser: {
    display_name: string;
    name: string;
    id: string | number;
  };
};

export type ArresteeInfoType = Omit<CmdOptionsType, "Arrestee"> & {
  FormattedCharges: string;
  BookingMugshotURL: string;
  BookingNumber: string;
  RobloxUser: {
    display_name: string;
    name: string;
    id: string | number;
  };
};

export default async function LogArrestReport(
  CachedInteract: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">,
  ArresteeInfo: ArresteeInfoType,
  ReporterInfo: ReporterInfoType
) {
  ReporterInfo.ReportDate = ReporterInfo.ReportDate ?? CachedInteract.createdAt;
  ReporterInfo.AsstOfficers = ReporterInfo.AsstOfficers ?? [];

  const QueryFilter = { _id: CachedInteract.guildId };
  const GuildDoc = await GuildModel.findOneAndUpdate(QueryFilter, QueryFilter, {
    upsert: true,
    new: true,
  });

  const FArresteeName = FormatUsername(ArresteeInfo.RobloxUser);
  const FReporterName = FormatUsername(ReporterInfo.RobloxUser);
  const FAsstOfficers = ReporterInfo.AsstOfficers.length
    ? ListFormatter.format(Array.from(ReporterInfo.AsstOfficers, (Id) => userMention(Id)))
    : "N/A";

  const ArrestLogData: Partial<(typeof GuildDoc.logs.arrests)[number]> = {
    _id: ArresteeInfo.BookingNumber,
    arrestee_formatted_name: FArresteeName,
    arrestee_roblox_id: Number(ArresteeInfo.RobloxUser.id),

    made_at: ReporterInfo.ReportDate,
    arrest_assisting_officers: ReporterInfo.AsstOfficers,
    arresting_officer_formatted_name: FReporterName,
    arresting_officer_discord_id: ReporterInfo.DiscordUserId,
    arresting_officer_roblox_id: Number(ReporterInfo.RobloxUser.id),

    charges: ArresteeInfo.FormattedCharges,
    gender: ArresteeInfo.Gender,
    height: ArresteeInfo.Height,
    weight: ArresteeInfo.Weight,
    age_group: ArresteeInfo.AgeGroup,
    mugshot_url: ArresteeInfo.BookingMugshotURL,
  };

  GuildDoc.logs.arrests.addToSet(ArrestLogData);
  await GuildDoc.save();

  const ReportDescription = Dedent(`
    Arrest report submitted by <@${ReporterInfo.DiscordUserId}>.
    Arrest assisting officers: ${FAsstOfficers}
    Booking number: \`${ArresteeInfo.BookingNumber}\`
  `);

  const FormattedReport = new EmbedBuilder()
    .setTitle("LAPD — Arrest Report")
    .setDescription(ReportDescription)
    .setTimestamp(CachedInteract.createdTimestamp)
    .setThumbnail(ArresteeInfo.BookingMugshotURL)
    .setTimestamp(ReporterInfo.ReportDate)
    .setImage(Images.LAPD_Header)
    .setColor(Colors.DarkBlue)
    .setFooter({
      iconURL: Icons.Signature,
      text: `Report signed by: ${FReporterName}`,
    })
    .setFields([
      {
        name: "Arrestee",
        value: FArresteeName,
        inline: true,
      },
      {
        name: "Gender",
        value: ArresteeInfo.Gender,
        inline: true,
      },
      {
        name: "Arrest Age",
        value: ArresteeInfo.AgeGroup,
        inline: true,
      },
      {
        name: "Height",
        value: ArresteeInfo.Height,
        inline: true,
      },
      {
        name: "Weight",
        value: ArresteeInfo.Weight,
        inline: true,
      },
      {
        name: "Convicted Charges",
        value: ArresteeInfo.FormattedCharges,
        inline: false,
      },
    ]);

  const MainMsgLink = await SendGuildMessages(
    CachedInteract,
    GuildDoc.settings.log_channels.arrests,
    {
      embeds: [FormattedReport],
    }
  );

  return {
    main_msg_link: MainMsgLink,
    booking_number: ArresteeInfo.BookingNumber,
  };
}
