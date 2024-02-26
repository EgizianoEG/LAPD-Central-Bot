import { EmbedBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { IsValidShiftTypeName } from "@Utilities/Other/Validators.js";
import { ErrorMessages } from "@Resources/AppMessages.js";
import { ExtraTypings } from "@Typings/Utilities/Database.js";

import HandleEmbedPagination from "@Utilities/Other/HandleEmbedPagination.js";
import DurationHumanize from "humanize-duration";
import ShiftModel from "@Models/Shift.js";
import Chunks from "@Utilities/Other/SliceIntoChunks.js";

const ReadableDuration = DurationHumanize.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Returns a formatted body text/description for one page.
 * @param PUDurations - Paginated user durations. An array of user Ids and their total shift durations in milliseconds.
 * @param RSIndex - The index of which the ranking should be started from; defaults to `0`.
 * @returns
 */
function FormatPageText(PUDurations: [string, number][], RSIndex: number = 0) {
  PUDurations = PUDurations || [];
  return Array.from(PUDurations, ([UserId, TotalDuration]) => {
    return `${++RSIndex}. <@${UserId}> \u{1680} ${ReadableDuration(TotalDuration)}`;
  }).join("\n");
}

/**
 *
 * @param Interaction - A cached user interaction to retrieve both guild name and icon url from.
 * @param PaginatedDurations - Paginated user durations; chunks of 10 entries or less.
 * @param CmdShiftType - Shift type that its leaderboard requested for; defaults to `null` and will consider it as all shift types.
 * @returns
 */
function BuildLeaderboardPages(
  Interaction: SlashCommandInteraction<"cached">,
  PaginatedDurations: [string, number][][],
  CmdShiftType: string | null
) {
  const LeaderboardPages: EmbedBuilder[] = [];

  for (const [PageIndex, PageData] of PaginatedDurations.entries()) {
    const PageEmbed = new InfoEmbed()
      .setThumbnail(null)
      .setTitle("Shift Leaderboard")
      .setDescription(FormatPageText(PageData, PageIndex * 10))
      .setFooter({
        text: "Showing leaderboard for " + (CmdShiftType ?? "all") + " duty shift type(s).",
      })
      .setAuthor({
        name: Interaction.guild.name,
        iconURL: Interaction.guild.iconURL() ?? undefined,
      });

    LeaderboardPages.push(PageEmbed);
  }

  return LeaderboardPages;
}

/**
 * Get the paginated durations for the given ShiftsData.
 * @param ShiftsData - An array of shift documents.
 * @returns Array of sorted and paginated durations ready to be formatted as text.
 * Where the first item of the array is the Discord user id and the second is the total on duty duration.
 */
function GetPaginatedDurations(ShiftsData: ExtraTypings.HydratedShiftDocument[]) {
  const UserGroupedDocs = Object.groupBy(ShiftsData, (Doc) => Doc.user);
  const MappedData = new Map<string, number>();

  // Calculate total on duty durations for each user.
  for (const [User, Shifts] of Object.entries(UserGroupedDocs)) {
    if (!Shifts) continue;
    MappedData.set(
      User,
      Shifts.reduce((OnDutySum, CurrDoc) => {
        OnDutySum += CurrDoc.durations.on_duty;
        return OnDutySum;
      }, 0)
    );
  }

  return Chunks(
    [...MappedData.entries()].sort((a, b) => b[1] - a[1]),
    10
  );
}

/**
 * @param Interaction
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const CmdShiftType = Interaction.options.getString("type", false);

  // Always return if the shift type provided is malformed.
  if (CmdShiftType && !IsValidShiftTypeName(CmdShiftType)) {
    return new ErrorEmbed()
      .setTitle(ErrorMessages.MalformedShiftTypeName.Title)
      .setDescription(ErrorMessages.MalformedShiftTypeName.Description)
      .replyToInteract(Interaction, true);
  }

  // Get all shifts in the server that are finished with or without a specific type then return paginated.
  const PaginatedData = await ShiftModel.find({
    end_timestamp: { $ne: null },
    guild: { $eq: Interaction.guildId },
    type: CmdShiftType ?? { $exists: true },
  }).then((Shifts) => {
    if (Shifts.length === 0) return [];
    return GetPaginatedDurations(Shifts);
  });

  if (PaginatedData.length === 0) {
    const ReplyEmbed = new InfoEmbed()
      .setTitle("No Shifts Found")
      .setDescription("There were no shift records in the server to display a leaderboard for.");
    if (CmdShiftType) {
      ReplyEmbed.setDescription(
        `There were no shift records with of the \`${CmdShiftType}\` type to display a leaderboard for.`
      );
    }

    return ReplyEmbed.replyToInteract(Interaction, true);
  }

  const BuiltPages = BuildLeaderboardPages(Interaction, PaginatedData, CmdShiftType);
  return HandleEmbedPagination(BuiltPages, Interaction, "Commands:Miscellaneous:Duty:Leaderboard");
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("leaderboard")
    .setDescription("Lists all recognized members' duty shift durations.")
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The type of duty shift to show leaderboard for.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
