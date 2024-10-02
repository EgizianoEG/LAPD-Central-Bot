import { GuildArrests, Shifts } from "@Typings/Utilities/Database.js";
import { ButtonInteraction } from "discord.js";
import { SendGuildMessages } from "@Utilities/Other/GuildMessages.js";
import { CmdOptionsType } from "@Cmds/Miscellaneous/Log/Deps/Arrest.js";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import { Images } from "@Config/Shared.js";

import GuildModel from "@Models/Guild.js";
import IncrementActiveShiftEvent from "@Utilities/Database/IncrementActiveShiftEvent.js";
import GetFormattedArrestReportEmbed from "./FormatArrestReportEmbed.js";

export type ReporterInfoType = {
  /** Shift currently active for the reporting officer */
  shift_active: Shifts.HydratedShiftDocument | null;

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
  const ArrestLogData: GuildArrests.ArrestRecord = {
    _id: ArresteeInfo.booking_num,
    made_on: ReporterInfo.report_date,
    assisting_officers: ReporterInfo.asst_officers,
    notes: ArresteeInfo.notes ?? null,

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

  const FormattedReport = (await GetFormattedArrestReportEmbed(ArrestLogData, false)).setImage(
    Images.LAPD_Header
  );

  const MainMsgLink = await SendGuildMessages(
    CachedInteract,
    GuildDocument.settings.duty_activities.log_channels.arrests,
    { embeds: [FormattedReport] }
  );

  return {
    main_msg_link: MainMsgLink,
    booking_number: ArresteeInfo.booking_num,
  };
}
