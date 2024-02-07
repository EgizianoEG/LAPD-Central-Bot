// Dependencies:
// -------------
import { SlashCommandBuilder, userMention } from "discord.js";
import { formatDistance, isAfter } from "date-fns";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";

import * as Chrono from "chrono-node";
import GetStaffFieldActivity from "@Utilities/Database/GetFieldActivity.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import GetUserThumbnail from "@Utilities/Roblox/GetUserThumb.js";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";
import IsLoggedIn from "@Utilities/Database/IsUserLoggedIn.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
/**
 * Officer activity show command.
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const OfficerSelected = Interaction.options.getMember("officer");
  const HRDateAfter = Interaction.options.getString("since");
  let DateAfterParsed: Date | null = null;

  if (OfficerSelected) {
    if (OfficerSelected.user.bot) {
      return new ErrorEmbed()
        .useErrTemplate("BotMemberSelected")
        .replyToInteract(Interaction, true, false);
    }
  } else {
    return new ErrorEmbed()
      .useErrTemplate("MemberNotFound")
      .replyToInteract(Interaction, true, false);
  }

  if (HRDateAfter) {
    DateAfterParsed = Chrono.parseDate(HRDateAfter, Interaction.createdAt);
    if (!DateAfterParsed) {
      return new ErrorEmbed()
        .useErrTemplate("UnknownDateFormat")
        .replyToInteract(Interaction, true, false);
    } else if (isAfter(DateAfterParsed, Interaction.createdAt)) {
      return new ErrorEmbed()
        .useErrTemplate("DateInFuture")
        .replyToInteract(Interaction, true, false);
    }
  }

  await Interaction.deferReply();
  const CurrServerNickname = OfficerSelected.nickname ?? OfficerSelected.user.displayName;
  const LinkedRobloxUserId = await IsLoggedIn({
    guildId: Interaction.guildId,
    user: OfficerSelected,
  });

  const TargetRUserInfo = LinkedRobloxUserId ? await GetUserInfo(LinkedRobloxUserId) : null;
  const TargetRUserThumb = await GetUserThumbnail(LinkedRobloxUserId, "180x180", "png", "bust");
  const FormattedRobloxName = TargetRUserInfo
    ? FormatUsername(TargetRUserInfo, false, true)
    : "*Not Linked*";

  const FieldActivityData = await GetStaffFieldActivity(OfficerSelected, DateAfterParsed);
  const ShiftsData = await GetMainShiftsData({
    user: OfficerSelected.id,
    guild: Interaction.guildId,
    start_timestamp: DateAfterParsed ? { $gte: DateAfterParsed } : { $exists: true },
  });

  const RespEmbed = new InfoEmbed()
    .setTitle(`Officer Activity — @${OfficerSelected.user.username}`)
    .setThumbnail(TargetRUserThumb)
    .setTimestamp(Interaction.createdAt)
    .setDescription(null)
    .setFields(
      {
        name: "**Basic Info:**",
        value: Dedent(`
          - User: ${userMention(OfficerSelected.id)}
          - Roblox Account: ${FormattedRobloxName}
          - Current Nickname: \`${CurrServerNickname}\`
      `),
      },
      {
        name: "**Shift Statistics**",
        value: Dedent(`
          - **Total Shifts:** \`${ShiftsData.shift_count}\`
          - **On-Duty Time**
           - Total: ${ShiftsData.total_onduty}   
           - Average: ${ShiftsData.avg_onduty}         
          - **On-Break Time**
           - Total: ${ShiftsData.total_onbreak}
           - Average: ${ShiftsData.avg_onbreak}
        `),
      },
      {
        name: "**Field Activity:**",
        value: Dedent(`
          - Arrests Made: \`${FieldActivityData.arrests_made}\`
          - Arrests Assisted: \`${FieldActivityData.arrests_assisted}\`
          - Citations Issued:
           - Warnings: \`${FieldActivityData.citations_issued.warnings}\`
           - Fines: \`${FieldActivityData.citations_issued.fines}\`
        `),
      }
    );

  if (DateAfterParsed) {
    RespEmbed.setFooter({
      text: `Showing activity since ${formatDistance(DateAfterParsed, Interaction.createdAt, {
        addSuffix: true,
      })}`,
    });
  }

  return Interaction.editReply({ embeds: [RespEmbed] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandWithOptions> = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Shows general activity information of an officer.")
    .setDMPermission(false)
    .addUserOption((Option) =>
      Option.setName("officer")
        .setDescription("The officer to show activity information for.")
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("since")
        .setDescription(
          "A specific date, timeframe, or relative time expression to view activity since then."
        )
        .setMinLength(2)
        .setMaxLength(40)
        .setRequired(false)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
