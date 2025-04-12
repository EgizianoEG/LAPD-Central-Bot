import {
  time,
  Colors,
  userMention,
  channelLink,
  EmbedBuilder,
  AttachmentBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { FormatUsername } from "@Utilities/Strings/Formatters.js";
import { IsValidRobloxUsername } from "@Utilities/Other/Validators.js";

import GetUserThumbnail from "@Utilities/Roblox/GetUserThumb.js";
import GetIdByUsername from "@Utilities/Roblox/GetIdByUsername.js";
import GetUserRecords from "@Utilities/Database/GetUserRecords.js";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const InputUsername = Interaction.options.getString("name", true);
  if (!IsValidRobloxUsername(InputUsername)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedRobloxUsername", InputUsername)
      .replyToInteract(Interaction, true);
  }

  const [RobloxUserId, ExactUsername, RAFound] = await GetIdByUsername(InputUsername, true);
  if (!RAFound) {
    return new ErrorEmbed()
      .useErrTemplate("NonexistentRobloxUsername", InputUsername)
      .replyToInteract(Interaction, true);
  }

  await Interaction.deferReply();
  const [RobloxUserInfo, UserRecords, RobloxThumbnail] = await Promise.all([
    GetUserInfo(RobloxUserId),
    GetUserRecords(Interaction.guildId, RobloxUserId, ExactUsername),
    GetUserThumbnail(RobloxUserId, "352x352", "png", "headshot"),
  ]);

  const FormattedUsername = FormatUsername(RobloxUserInfo, false, true);
  const ResponseEmbed = new EmbedBuilder()
    .setColor(Colors.DarkBlue)
    .setThumbnail(RobloxThumbnail)
    .setTitle("MDT Lookup Result")
    .setFields([
      {
        inline: false,
        name: "Summary",
        value: Dedent(`
          - **Name:** ${FormattedUsername}
          - **Records:** 
            - Arrests: [${UserRecords.total_arrests}](${channelLink(Interaction.channelId)})
            - Citations: [${UserRecords.total_citations}](${channelLink(Interaction.channelId)})
            - Incidents as Suspect: [${UserRecords.total_incidents_as_suspect}](${channelLink(Interaction.channelId)})
        `),
      },
    ]);

  if (UserRecords.recent_arrest) {
    const RecentArr = UserRecords.recent_arrest;
    const ArrestNotes = RecentArr.notes ? "\n```fix\n" + RecentArr.notes + "\n```" : "*N/A*";
    const FSpaceCount = 10;
    const Charges = RecentArr.arrestee.charges
      .map((Charge) => {
        if (Charge.includes("Statute") && Charge.includes("\n")) {
          const Split = Charge.split("\n");
          return `${Split[0]}\n${" ".repeat(FSpaceCount)}${Split[1]}`;
        }
        return Charge;
      })
      .join(`\n${" ".repeat(FSpaceCount)}`);

    ResponseEmbed.addFields({
      inline: true,
      name: "Recent Arrest",
      value: Dedent(`
        - **Booking:** [\`${RecentArr._id}\`](${channelLink(Interaction.channelId)})
        - **Made On:** ${time(RecentArr.made_on, "R")}
        - **Mugshot:** [See Here ⎋](${RecentArr.arrestee.mugshot_url})
        - **Arresting Officer:** ${userMention(RecentArr.arresting_officer.discord_id)}
        - **Arrest Notes:** ${ArrestNotes}
        - **Charges:** 
          ${Charges}
      `),
    });
  } else {
    ResponseEmbed.addFields({
      inline: true,
      name: "Recent Arrest",
      value: "*N/A*",
    });
  }

  if (UserRecords.recent_citation) {
    const RecentCit = UserRecords.recent_citation;
    const Violations = RecentCit.violations
      .map((V, I) => {
        if (typeof V === "string") return `${I + 1}. ${V}`;
        return `${I + 1}. ${V.violation}`;
      })
      .join(`\n${" ".repeat(10)}`);

    ResponseEmbed.addFields({
      inline: true,
      name: "Recent Citation",
      value: Dedent(`
        - **Num:** [\`${RecentCit.num}\`](${RecentCit.img_url || channelLink(Interaction.channelId)})
        - **Type:** \`${RecentCit.type}\`
        - **Issued:** ${time(RecentCit.issued_on, "R")}
        - **Citing Officer:** ${userMention(RecentCit.citing_officer.discord_id)}
        - **Violations:** 
          ${Violations}
      `),
    });
  } else {
    ResponseEmbed.addFields({
      inline: true,
      name: "Recent Citation",
      value: "*N/A*",
    });
  }

  if (UserRecords.recent_arrest || UserRecords.recent_citation) {
    if (!UserRecords.recent_arrest)
      ResponseEmbed.setFields(
        ResponseEmbed.data.fields![0],
        ResponseEmbed.data.fields![2],
        ResponseEmbed.data.fields![1]
      );
    if (!UserRecords.recent_citation)
      ResponseEmbed.setFields(
        ResponseEmbed.data.fields![0],
        ResponseEmbed.data.fields![1],
        ResponseEmbed.data.fields![2]
      );
  } else {
    ResponseEmbed.setFields(ResponseEmbed.data.fields![0]);
  }

  if (RobloxThumbnail.includes("placehold")) {
    return Interaction.editReply({ embeds: [ResponseEmbed] });
  } else {
    const RThumbAttachment = new AttachmentBuilder(RobloxThumbnail, {
      name: `th-${RobloxUserInfo.name.toLowerCase()}.png`,
    });

    ResponseEmbed.setThumbnail(`attachment://${RThumbAttachment.name}`);
    return Interaction.editReply({
      embeds: [ResponseEmbed],
      files: [RThumbAttachment],
    });
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandBuilder> = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("lookup")
    .setDescription("Provides recent info on a target person.")
    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The name of the person to do the lookup on (Roblox username).")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
