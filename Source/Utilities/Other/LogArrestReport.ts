import { ButtonInteraction, Colors, EmbedBuilder, userMention } from "discord.js";
import { CmdOptionsType } from "@Cmds/Miscellaneous/Log/Deps/Arrest.js";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import { Images, Icons } from "@Config/Shared.js";
import { ExtraTypings } from "@Typings/Utilities/Database.js";

import Dedent from "dedent";
import GuildModel from "@Models/Guild.js";
import SendGuildMessages from "@Utilities/Other/SendGuildMessages.js";
import IncrementActiveShiftEvent from "@Utilities/Database/IncrementActiveShiftEvent.js";
const ListFormatter = new Intl.ListFormat("en");

export type ReporterInfoType = {
  /** Shift currently active for the reporting officer */
  shift_active: ExtraTypings.HydratedShiftDocument | null;

  /** Arresting/Reporting officer's Discord Id */
  discord_user_id: string;

  /** Discord Ids of the arrest assisting officers if applicable */
  asst_officers?: string[];

  /** The date of the report/arrest; defaults to the CMD interaction created at date */
  report_date?: Date;

  /** Arresting/Reporting officer's roblox user details */
  roblox_user: {
    display_name: string;
    name: string;
    id: string | number;
  };
};

export type ArresteeInfoType = Omit<CmdOptionsType, "Arrestee"> & {
  notes?: string | null;
  formatted_charges: string[];
  booking_mugshot: string;
  booking_num: number;
  roblox_user: {
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
  ReporterInfo.report_date = ReporterInfo.report_date ?? CachedInteract.createdAt;
  ReporterInfo.asst_officers = ReporterInfo.asst_officers ?? [];

  const QueryFilter = { _id: CachedInteract.guildId };
  const GuildDocument = await GuildModel.findOneAndUpdate(QueryFilter, QueryFilter, {
    upsert: true,
    new: true,
  });

  const FArresteeName = FormatUsername(ArresteeInfo.roblox_user);
  const FReporterName = FormatUsername(ReporterInfo.roblox_user);
  const FAsstOfficers = ReporterInfo.asst_officers.length
    ? ListFormatter.format(Array.from(ReporterInfo.asst_officers, (Id) => userMention(Id)))
    : "N/A";

  const ArrestLogData: Partial<(typeof GuildDocument.logs.arrests)[number]> = {
    _id: ArresteeInfo.booking_num,
    made_at: ReporterInfo.report_date,
    arrest_assisting_officers: ReporterInfo.asst_officers,
    notes: ArresteeInfo.notes,

    arrestee: {
      roblox_id: Number(ArresteeInfo.roblox_user.id),
      formatted_name: FArresteeName,
      charges: ArresteeInfo.formatted_charges,
      gender: ArresteeInfo.Gender,
      height: ArresteeInfo.Height,
      weight: ArresteeInfo.Weight,
      age_group: ArresteeInfo.AgeGroup,
      mugshot_url: ArresteeInfo.booking_mugshot,
    },

    arresting_officer: {
      formatted_name: FReporterName,
      discord_id: ReporterInfo.discord_user_id,
      roblox_id: Number(ReporterInfo.roblox_user.id),
    },
  };

  GuildDocument.logs.arrests.addToSet(ArrestLogData);
  await Promise.all([
    GuildDocument.save(),
    IncrementActiveShiftEvent("arrests", CachedInteract.user.id, GuildDocument._id).catch(
      () => null
    ),
  ]);

  const ReportDescription = Dedent(`
    Arrest report submitted by <@${ReporterInfo.discord_user_id}>.
    Arrest assisting officers: ${FAsstOfficers}
    Booking number: \`${ArresteeInfo.booking_num}\`
  `);

  const FormattedReport = new EmbedBuilder()
    .setTitle("LAPD — Arrest Report")
    .setDescription(ReportDescription)
    .setTimestamp(CachedInteract.createdTimestamp)
    .setThumbnail(ArresteeInfo.booking_mugshot)
    .setTimestamp(ReporterInfo.report_date)
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
        value: ArresteeInfo.Weight + " lbs",
        inline: true,
      },
      {
        name: "Convicted Charges",
        value: ArresteeInfo.formatted_charges.join("\n"),
        inline: false,
      },
    ]);

  const MainMsgLink = await SendGuildMessages(
    CachedInteract,
    GuildDocument.settings.log_channels.arrests,
    {
      embeds: [FormattedReport],
    }
  );

  return {
    main_msg_link: MainMsgLink,
    booking_number: ArresteeInfo.booking_num,
  };
}
