import {
  Colors,
  inlineCode,
  userMention,
  channelLink,
  EmbedBuilder,
  time as FormatTime,
} from "discord.js";

import { IsValidDiscordAttachmentLink } from "./Validators.js";
import { GuildIncidents } from "@Typings/Utilities/Database.js";
import Dedent from "dedent";
const ListFormatter = new Intl.ListFormat("en");

/**
 * Generates an array of embeds to display an incident report.
 * @param IncidentRecord - The incident record to generate the embed for.
 * @param ReportTargetChannel - The channel which the report will be sent to. Used to for the embed(s) title URL and gallray view feature.
 *                              If not provided, a dummy URL will be used that won't redirect user to any destination.
 *
 * @returns An array of embeds or single embed if attachments were provided with only one element.
 */
export default function GetIncidentReportEmbeds(
  IncidentRecord: GuildIncidents.IncidentRecord,
  ReportTargetChannel?: {
    guild_id?: string;
    channel_id?: string;
  }
) {
  const AttachmentDistributerEmbeds: EmbedBuilder[] = [];
  const IncidentReportEmbed = new EmbedBuilder()
    .setTitle("LAPD — Incident Report")
    .setColor(Colors.DarkBlue)
    .setDescription(
      Dedent(`
        **Incident Number:** ${inlineCode(IncidentRecord._id ? IncidentRecord._id.toString() : "[unknown]")}
        **Incident Reported By:** ${userMention(IncidentRecord.reported_by.discord_id)}
        **Incident Reported On:** ${FormatTime(IncidentRecord.reported_on, "f")}
        **Involved Officers:** ${IncidentRecord.officers.length ? ListFormatter.format(IncidentRecord.officers) : "None"}
      `)
    )
    .setFields([
      {
        inline: true,
        name: "Incident Type",
        value: IncidentRecord.type,
      },
      {
        inline: true,
        name: "Status",
        value: IncidentRecord.status,
      },
      {
        inline: true,
        name: "Location",
        value: IncidentRecord.location,
      },
      {
        inline: true,
        name: "Suspects",
        value: IncidentRecord.suspects.length ? IncidentRecord.suspects.join(", ") : "N/A",
      },
      {
        inline: true,
        name: "Victims",
        value: IncidentRecord.victims.length ? IncidentRecord.victims.join(", ") : "N/A",
      },
      {
        inline: true,
        name: "Witnesses",
        value: IncidentRecord.witnesses?.length ? IncidentRecord.witnesses.join(", ") : "N/A",
      },
      {
        inline: false,
        name: "Incident Description",
        value: IncidentRecord.description,
      },
    ]);

  if (IncidentRecord.notes) {
    IncidentReportEmbed.addFields({
      inline: false,
      name: "Notes",
      value: IncidentRecord.notes,
    });
  }

  if (IncidentRecord.last_updated && IncidentRecord.last_updated_by) {
    IncidentReportEmbed.setTimestamp(IncidentRecord.last_updated).setFooter({
      text: `Last updated by @${IncidentRecord.last_updated_by.discord_username} on`,
    });
  }

  const IncidentAttachments = IncidentRecord.attachments.filter((AttachmentLink) =>
    IsValidDiscordAttachmentLink(AttachmentLink, false, "image")
  );

  if (IncidentAttachments.length) {
    IncidentReportEmbed.setImage(IncidentAttachments[0]);
    if (IncidentAttachments.length > 1) {
      const SampleURL = ReportTargetChannel?.channel_id
        ? channelLink(ReportTargetChannel.channel_id)
        : ReportTargetChannel?.guild_id
          ? `https://discord.com/channels/${ReportTargetChannel.guild_id}/`
          : "https://discord.com";

      IncidentReportEmbed.setURL(SampleURL);
      for (const AttachmentLink of IncidentAttachments.slice(1)) {
        AttachmentDistributerEmbeds.push(
          new EmbedBuilder().setURL(SampleURL).setColor(Colors.DarkBlue).setImage(AttachmentLink)
        );
      }
    }
  }

  return [IncidentReportEmbed, ...AttachmentDistributerEmbeds].slice(0, 10);
}
