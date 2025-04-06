// Dependencies:
// -------------
import { Colors, EmbedBuilder, SlashCommandSubcommandBuilder, userMention } from "discord.js";
import { formatDistance, isAfter } from "date-fns";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

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
 * @param Interaction
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const InputSince = Interaction.options.getString("since");
  let OfficerSelected = Interaction.options.getMember("officer");
  let SinceDate: Date | null = null;

  if (OfficerSelected) {
    if (OfficerSelected.user.bot) {
      return new ErrorEmbed()
        .useErrTemplate("BotMemberSelected")
        .replyToInteract(Interaction, true, false);
    }
  } else {
    OfficerSelected = Interaction.member;
  }

  if (InputSince) {
    SinceDate = Chrono.parseDate(InputSince, Interaction.createdAt);
    if (!SinceDate && !InputSince.match(/\bago\s*$/i)) {
      SinceDate = Chrono.parseDate(`${InputSince} ago`, Interaction.createdAt);
    }

    if (!SinceDate) {
      return new ErrorEmbed()
        .useErrTemplate("UnknownDateFormat")
        .replyToInteract(Interaction, true, false);
    } else if (isAfter(SinceDate, Interaction.createdAt)) {
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

  const FieldActivityData = await GetStaffFieldActivity(OfficerSelected, SinceDate);
  const ShiftsData = await GetMainShiftsData({
    user: OfficerSelected.id,
    guild: Interaction.guildId,
    start_timestamp: SinceDate ? { $gte: SinceDate } : { $exists: true },
  });

  const RespEmbed = new EmbedBuilder()
    .setTitle(`Officer Activity — @${OfficerSelected.user.username}`)
    .setThumbnail(TargetRUserThumb)
    .setColor(Colors.DarkBlue)
    .setFields(
      {
        name: "**Basic Information:**",
        value: Dedent(`
          - Officer: ${userMention(OfficerSelected.id)}
          - Linked Account: ${FormattedRobloxName}
          - Current Nickname: \`${CurrServerNickname}\`
        `),
      },
      {
        inline: true,
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
        inline: true,
        name: "**Field Activity:**",
        value: Dedent(`
          - Arrests Made: \`${FieldActivityData.arrests_made}\`
          - Arrests Assisted: \`${FieldActivityData.arrests_assisted}\`
          - Incidents Reported: \`${FieldActivityData.incidents_reported}\`
          - Citations Issued:
            - Warnings: \`${FieldActivityData.citations_issued.warnings}\`
            - Fines: \`${FieldActivityData.citations_issued.fines}\`
        `),
      }
    );

  if (SinceDate) {
    RespEmbed.setFooter({
      text: `Showing activity since ${formatDistance(SinceDate, Interaction.createdAt, { addSuffix: true })}`,
    });
  }

  return Interaction.editReply({ embeds: [RespEmbed] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandBuilder> = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("for")
    .setDescription("Shows general activity information of an officer.")
    .addUserOption((Option) =>
      Option.setName("officer")
        .setDescription("The officer to show activity information for. Defaults to yourself.")
        .setRequired(false)
    )
    .addStringOption((Option) =>
      Option.setName("since")
        .setDescription(
          "A specific date, timeframe, or relative time expression to view activity since then."
        )
        .setMinLength(2)
        .setMaxLength(40)
        .setRequired(false)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
