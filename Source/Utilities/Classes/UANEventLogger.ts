/* eslint-disable sonarjs/no-duplicate-string */
import {
  User,
  Guild,
  codeBlock,
  userMention,
  GuildMember,
  ButtonStyle,
  EmbedBuilder,
  ButtonBuilder,
  BaseInteraction,
  ImageURLOptions,
  ActionRowBuilder,
  TextBasedChannel,
  ButtonInteraction,
  GuildBasedChannel,
  time as FormatTime,
  ModalSubmitInteraction,
} from "discord.js";

import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { Embeds, Emojis, Images } from "@Config/Shared.js";
import { addMilliseconds, isAfter } from "date-fns";

import RegularDedent from "dedent";
import GuildModel from "@Models/Guild.js";
import DHumanize from "humanize-duration";

const DurationFormatter = DHumanize.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

const Dedent = (Str: string) => {
  return RegularDedent(Str)
    .replace(/\.\s{2,}(\w)/g, ". $1")
    .replace(/(\w)\s{2,}(\w)/g, "$1 $2");
};

type ANoticeDocument = UserActivityNotice.ActivityNoticeHydratedDocument;
type ManagementInteraction = ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">;
// ------------------------------------------------------------------------------------
// Class Definition:
// -----------------
/**
 * #### Handles the logging of LOA events and actions, the LOA updating notices sent to requesters, and the LOA request message editing, if possible and applicable.
 * **Note:**
 * - The cancellation of a leave of absence or loa extension request can only be done by the person who requested it, and a notice is sent to the requester if it is possible.
 * - A number of these class functions could return a Promise rejection/error when a message cannot be sent for example, so it is advised to take into consideration error handling when using them.
 */
export default class UserActivityNoticeLogger {
  private static readonly AvatarIconOpts: ImageURLOptions = { size: 128 };

  /**
   * @param Guild
   * @param Type - The type of logging channel to return.
   * - `log` - The log channel where updates on leave notices will be sent.
   * - `requests` - The log channel where requests for leave notices will be sent for approval.
   * @returns
   */
  private static async GetLoggingChannel(Guild: Guild, Type: "log" | "requests") {
    const LoggingChannelId = await GuildModel.findById(Guild.id)
      .select("settings.leave_notices")
      .then((GuildDoc) => {
        if (GuildDoc) {
          return GuildDoc.settings.leave_notices[`${Type}_channel`];
        }
        return null;
      });

    if (!LoggingChannelId) return null;
    const LoggingChannel = Guild.channels.cache.get(LoggingChannelId);
    const AbleToSendMsgs =
      LoggingChannel?.viewable &&
      LoggingChannel.isTextBased() &&
      LoggingChannel.permissionsFor(await Guild.members.fetchMe())?.has("SendMessages");

    return AbleToSendMsgs === true
      ? (LoggingChannel as GuildBasedChannel & TextBasedChannel)
      : null;
  }

  private static async GetUserProfileImageURL(Guild: Guild, UserId: string): Promise<string> {
    const User = await Guild.members.fetch(UserId).catch(() => null);
    return User?.displayAvatarURL(this.AvatarIconOpts) ?? Embeds.Thumbs.UnknownImage;
  }

  /**
   * Constructs a pre-defined embed for a LOA request.
   * @param Opts
   * @returns
   */
  private static GetRequestEmbed(Opts: {
    Type?: "Cancelled" | "Pending" | "Extension";
    Guild?: Guild;
    NoticeDocument: ANoticeDocument;
    CancellationDate?: Date;
  }) {
    Opts.Type = Opts.Type ?? "Pending";
    const RequesterId = Opts.NoticeDocument.user;
    const Strikethrough = Opts.Type === "Cancelled" ? "~~" : "";
    const Embed = new EmbedBuilder()
      .setImage(Images.FooterDivider)
      .setFooter({ text: `Reference ID: ${Opts.NoticeDocument._id}` })
      .setTitle(`${Opts.Type}  |  Leave of Absence Request`)
      .setColor(
        Opts.Type === "Cancelled" ? Embeds.Colors.LOARequestDenied : Embeds.Colors.LOARequestPending
      );

    if (Opts.Type === "Pending" || Opts.Type === "Cancelled") {
      Embed.setDescription(
        Dedent(`
          **Requester:** ${userMention(RequesterId)}
          **Duration:** ${Opts.NoticeDocument.duration_hr}
          **Ends On:** ${Strikethrough}${Opts.Type === "Pending" && Opts.NoticeDocument.review_date ? "" : "around "}${FormatTime(Opts.NoticeDocument.end_date, "D")}${Strikethrough}
          **Reason:** ${Opts.NoticeDocument.reason}
        `)
      );

      if (Opts.CancellationDate) {
        Embed.setTimestamp(Opts.CancellationDate);
        Embed.setFooter({
          text: `Reference ID: ${Opts.NoticeDocument._id}; cancelled by requester on`,
          iconURL:
            Opts.Guild?.members.cache
              .get(RequesterId)
              ?.user.displayAvatarURL(this.AvatarIconOpts) ?? Embeds.Thumbs.UnknownImage,
        });
      }
    } else {
      Embed.setDescription(
        Dedent(`
          **Requester:** ${userMention(RequesterId)}
          **Requested Extension:** ${Opts.NoticeDocument.extended_duration_hr}
          **Total Duration:** ${DurationFormatter(Opts.NoticeDocument.duration + Opts.NoticeDocument.extension_request!.duration)}
          **LOA Started On:** ${FormatTime(Opts.NoticeDocument.review_date!, "F")}
          **LOA Ends On:** after extension, around ${FormatTime(addMilliseconds(Opts.NoticeDocument.end_date, Opts.NoticeDocument.extension_request!.duration), "D")}
          **Extension Reason:** ${Opts.NoticeDocument.extension_request?.reason || "[Unspecified]"}
        `)
      );
    }

    return Embed;
  }

  /**
   * Retrieves the message embed for a Leave of Absence (LOA) extension request with the specified status.
   * @param Guild - The guild where the request was made.
   * @param LeaveDocument - The LOA document containing the extension request.
   * @param RequestStatus - The status of the extension request. Can be "Approved", "Denied", or "Cancelled".
   * @returns
   */
  public static async GetLOAExtRequestMessageEmbedWithStatus(
    Guild: Guild,
    LeaveDocument: ANoticeDocument,
    RequestStatus: "Pending" | "Approved" | "Denied" | "Cancelled"
  ) {
    const RequestEmbed = this.GetRequestEmbed({
      Type: "Extension",
      NoticeDocument: LeaveDocument,
    }).setTimestamp(LeaveDocument.extension_request?.review_date);

    if (RequestStatus === "Approved") {
      const AvatarURL = await this.GetUserProfileImageURL(Guild, LeaveDocument.reviewed_by!.id);
      RequestEmbed.setColor(Embeds.Colors.LOARequestApproved)
        .setTitle("Approved Extension  |  Leave of Absence Request")
        .setFooter({
          iconURL: AvatarURL,
          text: `Reference ID: ${LeaveDocument._id}; approved by @${LeaveDocument.reviewed_by!.username} on`,
        });
    } else if (RequestStatus === "Denied") {
      const AvatarURL = await this.GetUserProfileImageURL(Guild, LeaveDocument.reviewed_by!.id);
      RequestEmbed.setColor(Embeds.Colors.LOARequestDenied)
        .setTitle("Denied Extension  |  Leave of Absence Request")
        .setFooter({
          iconURL: AvatarURL,
          text: `Reference ID: ${LeaveDocument._id}; denied by @${LeaveDocument.reviewed_by!.username} on`,
        });
    } else if (RequestStatus === "Cancelled") {
      const AvatarURL = await this.GetUserProfileImageURL(Guild, LeaveDocument.user);
      RequestEmbed.setColor(Embeds.Colors.LOARequestDenied)
        .setFooter({
          iconURL: AvatarURL,
          text: `Reference ID: ${LeaveDocument._id}; cancelled by requester on`,
        })
        .setTitle("Cancelled Extension  |  Leave of Absence Request");
    }

    return RequestEmbed;
  }

  /**
   * Generates a message embed for a Leave of Absence (LOA) request with the specified status.
   * @param Guild - The guild where the request was made.
   * @param LeaveDocument - The updated LOA document.
   * @param RequestStatus - The status of the request.
   * @returns
   */
  public static async GetLOARequestMessageEmbedWithStatus(
    Guild: Guild,
    LeaveDocument: ANoticeDocument,
    RequestStatus: "Approved" | "Denied" | "Cancelled" | "Pending"
  ) {
    const RequestEmbed = this.GetRequestEmbed({
      Guild,
      Type: RequestStatus === "Cancelled" ? RequestStatus : "Pending",
      NoticeDocument: LeaveDocument,
      CancellationDate:
        RequestStatus === "Cancelled" ? LeaveDocument.review_date : (undefined as any),
    }).setTimestamp(LeaveDocument.review_date);

    if (RequestStatus === "Approved" && LeaveDocument.review_date) {
      const AvatarURL = await this.GetUserProfileImageURL(Guild, LeaveDocument.reviewed_by!.id);
      RequestEmbed.setColor(Embeds.Colors.LOARequestApproved)
        .setTitle("Approved  |  Leave of Absence Request")
        .setFooter({
          text: `Reference ID: ${LeaveDocument._id}; approved by @${LeaveDocument.reviewed_by!.username} on`,
          iconURL: AvatarURL,
        });
    } else if (RequestStatus === "Denied" && LeaveDocument.review_date) {
      const AvatarURL = await this.GetUserProfileImageURL(Guild, LeaveDocument.reviewed_by!.id);
      RequestEmbed.setColor(Embeds.Colors.LOARequestDenied)
        .setTitle("Denied  |  Leave of Absence Request")
        .setFooter({
          text: `Reference ID: ${LeaveDocument._id}; denied by @${LeaveDocument.reviewed_by!.username} on`,
          iconURL: AvatarURL,
        });
    } else if (RequestStatus.includes("Cancelled")) {
      const AvatarURL = await this.GetUserProfileImageURL(Guild, LeaveDocument.user);
      RequestEmbed.setColor(Embeds.Colors.LOARequestDenied)
        .setTitle("Cancelled  |  Leave of Absence Request")
        .setFooter({
          iconURL: AvatarURL,
          text: `Reference ID: ${LeaveDocument._id}; cancelled by requester on`,
        });
    }

    return RequestEmbed;
  }

  /**
   * Sends a new leave request to the requests channel for approval from management, if one exists.
   * This function will also send a DM notice to the requester if it can.
   * @param Interaction - The interaction originating from the one who submitted the LOA request.
   * @param PendingLOA - The LOA that is pending for approval.
   * @returns A Promise that resolves to the sent request message if successful.
   */
  public static async SendRequest(
    Interaction: SlashCommandInteraction<"cached">,
    PendingLOA: ANoticeDocument
  ) {
    const RequestsChannel = await this.GetLoggingChannel(Interaction.guild, "requests");
    const Requester = await Interaction.guild.members.fetch(PendingLOA.user).catch(() => null);

    // Send a DM notice to the requester.
    if (Requester) {
      const DMNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestPending)
        .setFooter({ text: `Reference ID: ${PendingLOA._id}` })
        .setTitle("Leave of Absence — Request Under Review")
        .setDescription(
          Dedent(`
            Your leave of absence request, submitted on ${FormatTime(PendingLOA.request_date, "D")}, has been received and is \
            waiting for a review by the management team. The requested leave duration is ${PendingLOA.duration_hr}, and will \
            start on the time of approval. To cancel your pending request, please use the \`/loa manage\` command on the server.
          `)
        )
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      Requester.send({ embeds: [DMNotice] }).catch(() => null);
    }

    // Send the LOA request message if a requests channel is set.
    if (!RequestsChannel) return;
    const RequestEmbed = this.GetRequestEmbed({ Type: "Pending", NoticeDocument: PendingLOA });
    const ManagementComponents = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(`loa-approve:${Interaction.user.id}:${PendingLOA._id}`)
        .setLabel("Approve")
        .setEmoji(Emojis.WhiteCheck)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`loa-deny:${Interaction.user.id}:${PendingLOA._id}`)
        .setLabel("Deny")
        .setEmoji(Emojis.WhiteCross)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`loa-info:${Interaction.user.id}:${PendingLOA._id}`)
        .setLabel("Additional Information")
        .setEmoji(Emojis.WhitePlus)
        .setStyle(ButtonStyle.Secondary)
    );

    return RequestsChannel.send({ embeds: [RequestEmbed], components: [ManagementComponents] });
  }

  /**
   * Sends a log of a cancelled LOA to the logging channel, if one exists.
   * @param Interaction - The extension interaction received from the one who originally submitted the LOA.
   * @param ActiveLOA - The updated LOA that is currently active and which an extension was requested for.
   * @returns A Promise that resolves to the sent request message if successful.
   */
  public static async SendExtensionRequest(
    Interaction: ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">,
    ActiveLOA: ANoticeDocument
  ) {
    const RequestsChannel = await this.GetLoggingChannel(Interaction.guild, "requests");
    const Requester = await Interaction.guild.members.fetch(ActiveLOA.user).catch(() => null);

    if (Requester && ActiveLOA.extension_request?.date) {
      const DMNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestPending)
        .setFooter({ text: `Reference ID: ${ActiveLOA._id}` })
        .setTitle("Leave of Absence — Extension Request Under Review")
        .setDescription(
          Dedent(`
            Your leave of absence extension request, submitted on ${FormatTime(ActiveLOA.extension_request.date, "D")}, has been received and is waiting for a \
            review by the management team. The requested additional duration is ${ActiveLOA.extended_duration_hr}, and will be added to the leave once the \
            request is approved. To cancel your pending request, please use the \`/loa manage\` command on the server.
          `)
        )
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      Requester.send({ embeds: [DMNotice] }).catch(() => null);
    }

    if (!RequestsChannel) return;
    const RequestEmbed = this.GetRequestEmbed({ Type: "Extension", NoticeDocument: ActiveLOA });
    const ManagementComponents = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(`loa-ext-approve:${Interaction.user.id}:${ActiveLOA._id}`)
        .setLabel("Approve")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`loa-ext-deny:${Interaction.user.id}:${ActiveLOA._id}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`loa-info:${Interaction.user.id}:${ActiveLOA._id}`)
        .setLabel("Additional Information")
        .setStyle(ButtonStyle.Secondary)
    );

    return RequestsChannel.send({ embeds: [RequestEmbed], components: [ManagementComponents] });
  }

  /**
   * Sends a log of an approved LOA to the logging channel, if one exists. Also sends a DM notice to the requester and edits the LOA request message.
   * @param Interaction - The interaction received from the management staff to approve the LOA.
   * @param ApprovedLOA - The LOA that was approved after being updated.
   * @returns A Promise that resolves after the edition of the request message if it exists.
   */
  public static async LogApproval(
    Interaction: ManagementInteraction,
    ApprovedLOA: ANoticeDocument
  ) {
    const Requester = await Interaction.guild.members.fetch(ApprovedLOA.user).catch(() => null);
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");

    if (Requester) {
      const DMApprovalNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setFooter({ text: `Reference ID: ${ApprovedLOA._id}` })
        .setTitle("Leave of Absence — Approval Notice")
        .setDescription(
          Dedent(`
            Your leave of absence request, submitted on ${FormatTime(ApprovedLOA.request_date, "D")}, has been approved.
            Your LOA is set to expire on ${FormatTime(ApprovedLOA.end_date, "F")} (${FormatTime(ApprovedLOA.end_date, "R")}). \
            To manage your leave, including requesting an extension or an early termination, please use the \`/loa manage\` command on the server.
          `)
        )
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      Requester.send({ embeds: [DMApprovalNotice] }).catch(() => null);
    }

    // Send a log message to the server specified channel in the config.
    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setTitle("Leave of Absence Approval")
        .setFooter({ text: `Reference ID: ${ApprovedLOA._id}; approved on` })
        .addFields(
          {
            inline: true,
            name: "Request Info",
            value: Dedent(`
            **Requester:** ${userMention(ApprovedLOA.user)}
            **Duration:** ${ApprovedLOA.duration_hr}
            **Started:** ${FormatTime(ApprovedLOA.review_date || Interaction.createdAt, "F")}
            **Ends On:** ${FormatTime(ApprovedLOA.end_date, "F")}
            **Reason:** ${ApprovedLOA.reason}
          `),
          },
          {
            inline: true,
            name: "Approval Info",
            value: Dedent(`
              **Approver**: ${userMention(Interaction.user.id)}
              **Notes:**
              ${ApprovedLOA.reviewer_notes || "`N/A`"}
            `),
          }
        );

      LogChannel.send({ embeds: [LogEmbed] });
    }

    if (ApprovedLOA.request_msg) {
      const [ReqChannelId, ReqMsgId] = ApprovedLOA.request_msg.split(":");
      const RequestMessage = await Interaction.guild.channels
        .fetch(ReqChannelId)
        .then((Channel) => {
          if (!Channel?.isTextBased()) return null;
          return Channel as TextBasedChannel;
        })
        .then((Channel) => Channel?.messages.fetch(ReqMsgId))
        .catch(() => null);

      if (RequestMessage) {
        const RequestEmbed = this.GetRequestEmbed({ Type: "Pending", NoticeDocument: ApprovedLOA })
          .setTimestamp(Interaction.createdAt)
          .setColor(Embeds.Colors.LOARequestApproved)
          .setTitle("Approved  |  Leave of Absence Request")
          .setFooter({
            text: `Reference ID: ${ApprovedLOA._id}; approved by @${Interaction.user.username} on`,
            iconURL: Interaction.user.displayAvatarURL(this.AvatarIconOpts),
          });

        const RequestButtons = ActionRowBuilder.from<ButtonBuilder>(
          RequestMessage.components[0] as any
        );

        RequestButtons.components.forEach((Button) => Button.setDisabled(true));
        await RequestMessage.edit({ embeds: [RequestEmbed], components: [RequestButtons] }).catch(
          () => null
        );
      }
    }
  }

  /**
   * Sends a log of a denied LOA to the logging channel, if one exists. Also sends a DM notice to the requester and edits the LOA request message.
   * @param Interaction - The interaction received from the management staff to deny the LOA.
   * @param DeniedLOA - The LOA that was denied after being updated.
   * @returns A Promise that resolves after the edition of the request message if it exists.
   */
  public static async LogDenial(Interaction: ManagementInteraction, DeniedLOA: ANoticeDocument) {
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");
    const Requester = await Interaction.guild.members.fetch(DeniedLOA.user).catch(() => null);

    if (Requester) {
      const DMDenialNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestDenied)
        .setFooter({ text: `Reference ID: ${DeniedLOA._id}` })
        .setTitle("Leave of Absence — Denial Notice")
        .setDescription(
          Dedent(`
            Your leave of absence request, submitted on ${FormatTime(DeniedLOA.request_date, "D")}, has been denied. \
            You may submit a new request within 3 hours by using the \`/loa request\` command on the server. 
            
            **The following note(s) were provided by the reviewer:**
            ${codeBlock("", DeniedLOA.reviewer_notes || "N/A")}
          `)
        )
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      Requester.send({ embeds: [DMDenialNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setColor(Embeds.Colors.LOARequestDenied)
        .setTitle("Leave of Absence Denial")
        .setFooter({ text: `Reference ID: ${DeniedLOA._id}; denied on` })
        .setTimestamp(Interaction.createdAt)
        .addFields(
          {
            inline: true,
            name: "Request Info",
            value: Dedent(`
              **Requester:** ${userMention(DeniedLOA.user)}
              **Duration:** ${DeniedLOA.duration_hr}
              **Ends On:** ${FormatTime(DeniedLOA.end_date, "D")}
              **Reason:** ${DeniedLOA.reason}
            `),
          },
          {
            inline: true,
            name: "Denial Info",
            value: Dedent(`
              **Denier**: ${userMention(Interaction.user.id)}
              **Notes:**
              ${DeniedLOA.reviewer_notes || "`N/A`"}
            `),
          }
        );

      LogChannel.send({ embeds: [LogEmbed] });
    }

    if (DeniedLOA.request_msg) {
      const [ReqChannelId, ReqMsgId] = DeniedLOA.request_msg.split(":");
      const RequestMessage = await Interaction.guild.channels
        .fetch(ReqChannelId)
        .then((Channel) => {
          if (!Channel?.isTextBased()) return null;
          return Channel as TextBasedChannel;
        })
        .then((Channel) => Channel?.messages.fetch(ReqMsgId))
        .catch(() => null);

      if (RequestMessage) {
        const RequestEmbed = this.GetRequestEmbed({ Type: "Pending", NoticeDocument: DeniedLOA })
          .setTimestamp(Interaction.createdAt)
          .setColor(Embeds.Colors.LOARequestDenied)
          .setTitle("Denied  |  Leave of Absence Request")
          .setFooter({
            text: `Reference ID: ${DeniedLOA._id}; denied by @${Interaction.user.username} on`,
            iconURL: Interaction.user.displayAvatarURL(this.AvatarIconOpts),
          });

        const RequestButtons = ActionRowBuilder.from<ButtonBuilder>(
          RequestMessage.components[0] as any
        );

        RequestButtons.components.forEach((Button) => Button.setDisabled(true));
        await RequestMessage.edit({ embeds: [RequestEmbed], components: [RequestButtons] }).catch(
          () => null
        );
      }
    }
  }

  /**
   * Sends a log of a cancelled LOA to the logging channel, if one exists. Also sends a DM notice to the requester and edits the LOA request message.
   * @param Interaction - The cancellation interaction received from the one who originally submitted the LOA.
   * @param CancelledLOA - The LOA that was cancelled after being updated.
   * @returns A Promise that resolves after the edition of the request message if it exists.
   */
  public static async LogCancellation(
    Interaction: ButtonInteraction<"cached">,
    CancelledLOA: ANoticeDocument
  ) {
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");
    const Requester = await Interaction.guild.members.fetch(CancelledLOA.user).catch(() => null);

    if (Requester) {
      const DMCancellationNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestDenied)
        .setFooter({ text: `Reference ID: ${CancelledLOA._id}` })
        .setTitle("Leave of Absence — Cancellation Notice")
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      if (CancelledLOA.reviewed_by) {
        DMCancellationNotice.setDescription(
          Dedent(`
            You are no longer on leave as your most recent leave of absence, submitted on ${FormatTime(CancelledLOA.request_date, "D")}, \
            has been cancelled at your request on ${FormatTime(Interaction.createdAt, "d")}. The leave was set to end ${FormatTime(CancelledLOA.end_date, "R")}.
          `)
        );
      } else {
        DMCancellationNotice.setDescription(
          Dedent(`
            Your previously submitted leave of absence request, with a duration of ${CancelledLOA.duration_hr}, has been cancelled at your request. \
            There is no active leave of absence on record for you at this time.
          `)
        );
      }

      Requester.send({ embeds: [DMCancellationNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestCancelled)
        .setTitle("Leave of Absence Cancellation")
        .setFooter({ text: `Reference ID: ${CancelledLOA._id}; cancelled by requester on` })
        .addFields({
          inline: true,
          name: "Request Info",
          value: Dedent(`
            **Requester:** ${userMention(CancelledLOA.user)}
            **Duration:** ${CancelledLOA.duration_hr}
            **Reason:** ${CancelledLOA.reason}
          `),
        });

      LogChannel.send({ embeds: [LogEmbed] }).catch(() => null);
    }

    if (CancelledLOA.request_msg) {
      const [ReqChannelId, ReqMsgId] = CancelledLOA.request_msg.split(":");
      const RequestMessage = await Interaction.guild.channels
        .fetch(ReqChannelId)
        .then((Channel) => {
          if (!Channel?.isTextBased()) return null;
          return Channel as TextBasedChannel;
        })
        .then((Channel) => Channel?.messages.fetch(ReqMsgId))
        .catch(() => null);

      if (!RequestMessage) return;
      const RequestEmbed = this.GetRequestEmbed({
        Type: "Cancelled",
        Guild: Interaction.guild,
        NoticeDocument: CancelledLOA,
        CancellationDate: Interaction.createdAt,
      });

      const RequestButtons = ActionRowBuilder.from<ButtonBuilder>(
        RequestMessage.components[0] as any
      );

      RequestButtons.components.forEach((Button) => Button.setDisabled(true));
      await RequestMessage.edit({ embeds: [RequestEmbed], components: [RequestButtons] }).catch(
        () => null
      );
    }
  }

  /**
   * Sends a log message of a manual LOA creation by a management staff member to the logging channel, if one exists. Also sends a DM notice to the requester.
   * @param Interaction - The interaction received from the management staff to create the LOA.
   * @param CreatedLOA - The LOA that was created.
   * @returns A Promise that resolves after sending the log message.
   */
  public static async LogManualLeave(
    Interaction: ManagementInteraction,
    CreatedLOA: ANoticeDocument
  ) {
    const Requester = await Interaction.guild.members.fetch(CreatedLOA.user).catch(() => null);
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");

    if (Requester) {
      const DMNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setFooter({ text: `Reference ID: ${CreatedLOA._id}` })
        .setTitle("Leave of Absence — Start Notice")
        .setDescription(
          Dedent(`
            You have been placed on leave by management staff, effective until ${FormatTime(CreatedLOA.end_date, "F")} (${FormatTime(CreatedLOA.end_date, "R")}).
          `)
        )
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      if (CreatedLOA.is_manageable) {
        DMNotice.setDescription(
          DMNotice.data.description +
            " To manage your leave, including requesting an extension or an early termination, please use the `/loa manage` command on the server."
        );
      } else {
        DMNotice.setDescription(
          DMNotice.data.description +
            " This leave is under management staff control, and therefore, extensions or early terminations are not possible at this time."
        );
      }

      if (CreatedLOA.reviewer_notes) {
        DMNotice.setDescription(
          DMNotice.data.description +
            `\n\n**The following note(s) were provided by the reviewer:**\n${codeBlock(CreatedLOA.reviewer_notes)}`
        );
      }

      Requester.send({ embeds: [DMNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setTitle("Leave of Absence Started")
        .setFooter({ text: `Reference ID: ${CreatedLOA._id}; placed on` })
        .addFields(
          {
            inline: true,
            name: "Request Info",
            value: Dedent(`
            **Leave For:** ${userMention(CreatedLOA.user)}
            **Duration:** ${CreatedLOA.duration_hr}
            **Started:** ${FormatTime(CreatedLOA.review_date || Interaction.createdAt, "F")}
            **Ends On:** ${FormatTime(CreatedLOA.end_date, "F")}
            **Reason:** ${CreatedLOA.reason}
          `),
          },
          {
            inline: true,
            name: "Approval Info",
            value: Dedent(`
              **Approver**: ${userMention(Interaction.user.id)}
              **Notes:**
              ${CreatedLOA.reviewer_notes || "`N/A`"}
            `),
          }
        );

      return LogChannel.send({ embeds: [LogEmbed] });
    }
  }

  /**
   * Sends a log of a manual LOA extension (immediately added and approved) to the logging channel, if one exists. Also sends a DM notice to who have the provided leave.
   * @param Interaction - The interaction received from the management staff to extend the leave.
   * @param NoticeDocument - The LOA document after being updated (extension added).
   */
  public static async LogManualExtension(
    Interaction: ManagementInteraction,
    NoticeDocument: ANoticeDocument
  ) {
    if (!NoticeDocument.extension_request || !NoticeDocument.review_date) return;
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");
    const Requester = await Interaction.guild.members.fetch(NoticeDocument.user).catch(() => null);

    if (Requester) {
      const DMApprovalNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setTitle("Leave of Absence — Extension Notice")
        .setDescription(
          Dedent(`
            Your leave of absence, started on ${FormatTime(NoticeDocument.request_date, "D")}, has been extended by a management staff. \
            The new leave end date is ${FormatTime(NoticeDocument.end_date, "F")} (${FormatTime(NoticeDocument.end_date, "R")}). \
            As of now, this LOA cannot be extended further, but you can request an early termination(if permitted) by \
            using the \`/loa manage\` command on the server.
          `)
        )
        .setFooter({
          text: `Reference ID: ${NoticeDocument._id}; extended by @${Interaction.user.username}`,
        })
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      Requester.send({ embeds: [DMApprovalNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setTitle("Leave of Absence Extended")
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}; extended on` })
        .addFields({
          inline: true,
          name: "Leave Info",
          value: Dedent(`
            **Leave For:** ${userMention(NoticeDocument.user)}
            **Leave Started:** ${FormatTime(NoticeDocument.review_date, "F")}
            **Leave Ends On:** after extension, ${FormatTime(NoticeDocument.end_date, "D")}
            **Extension Duration:** ${NoticeDocument.extended_duration_hr}
            **Extension Reason:** ${NoticeDocument.extension_request.reason || "`N/A`"}
          `),
        })
        .addFields({
          inline: true,
          name: "Management Staff",
          value: Dedent(`
              **Extended By**: ${userMention(NoticeDocument.extension_request.reviewed_by!.id)}
              **Notes:**
              ${NoticeDocument.extension_request.reviewer_notes || "`N/A`"}
            `),
        });

      LogChannel.send({ embeds: [LogEmbed] }).catch(() => null);
    }
  }

  /**
   * Sends a log of an approved LOA extension to the logging channel, if one exists.
   * @param Interaction - The interaction received from the management staff to approve the extension.
   * @param NoticeDocument - The LOA document after being updated.
   * @returns A Promise that resolves after the edition of the request message if it exists.
   */
  public static async LogExtensionApproval(
    Interaction: ManagementInteraction,
    NoticeDocument: ANoticeDocument
  ) {
    if (!NoticeDocument.extension_request || !NoticeDocument.review_date) return;
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");
    const Requester = await Interaction.guild.members.fetch(NoticeDocument.user).catch(() => null);

    if (Requester) {
      const DMApprovalNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}` })
        .setTitle("Leave of Absence — Extension Approval Notice")
        .setDescription(
          Dedent(`
            Your leave of absence extension request, submitted on ${FormatTime(NoticeDocument.extension_request.date, "D")}, has been approved.
            The approved leave is now set to expire on ${FormatTime(NoticeDocument.end_date, "F")} (${FormatTime(NoticeDocument.end_date, "R")}). \
            As of now, you cannot request an additional extension for this LOA, but you can request an early termination by using the \`/loa manage\` command on the server.
          `)
        )
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      Requester.send({ embeds: [DMApprovalNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestApproved)
        .setTitle("Leave of Absence Extension Approval")
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}; approved on` })
        .addFields(
          {
            inline: true,
            name: "Request Info",
            value: Dedent(`
              **Requester:** ${userMention(NoticeDocument.user)}
              **Extension:** ${NoticeDocument.extended_duration_hr}
              **Reason:** ${NoticeDocument.extension_request.reason}
            `),
          },
          {
            inline: true,
            name: "Active LOA",
            value: Dedent(`
              **Started On:** ${FormatTime(NoticeDocument.review_date, "F")}
              **Ends On:** after extension, ${FormatTime(NoticeDocument.end_date, "D")}
            `),
          },
          {
            inline: true,
            name: "Approval Info",
            value: Dedent(`
              **Approver**: ${userMention(NoticeDocument.extension_request.reviewed_by!.id)}
              **Notes:**
              ${NoticeDocument.extension_request.reviewer_notes || "`N/A`"}
            `),
          }
        );

      LogChannel.send({ embeds: [LogEmbed] }).catch(() => null);
    }

    if (NoticeDocument.extension_request.request_msg) {
      const [ReqChannelId, ReqMsgId] = NoticeDocument.extension_request.request_msg.split(":");
      const RequestMessage = await Interaction.guild.channels
        .fetch(ReqChannelId)
        .then((Channel) => {
          if (!Channel?.isTextBased()) return null;
          return Channel as TextBasedChannel;
        })
        .then((Channel) => Channel?.messages.fetch(ReqMsgId))
        .catch(() => null);

      if (RequestMessage) {
        const RequestEmbed = this.GetRequestEmbed({ Type: "Pending", NoticeDocument })
          .setTimestamp(Interaction.createdAt)
          .setColor(Embeds.Colors.LOARequestApproved)
          .setTitle("Approved Extension  |  Leave of Absence Request")
          .setFooter({
            text: `Reference ID: ${NoticeDocument._id}; approved by @${Interaction.user.username} on`,
            iconURL: Interaction.user.displayAvatarURL(this.AvatarIconOpts),
          });

        const RequestButtons = ActionRowBuilder.from<ButtonBuilder>(
          RequestMessage.components[0] as any
        );

        RequestButtons.components.forEach((Button) => Button.setDisabled(true));
        await RequestMessage.edit({ embeds: [RequestEmbed], components: [RequestButtons] }).catch(
          () => null
        );
      }
    }
  }

  /**
   * Sends a log of a denied LOA extension to the logging channel, if one exists.
   * @param Interaction - The interaction received from the management staff to deny the extension.
   * @param NoticeDocument - The LOA document after being updated.
   * @returns A Promise that resolves after the edition of the request message if it exists.
   */
  public static async LogExtensionDenial(
    Interaction: ManagementInteraction,
    NoticeDocument: ANoticeDocument
  ) {
    if (!NoticeDocument.extension_request || !NoticeDocument.review_date) return;
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");
    const Requester = await Interaction.guild.members.fetch(NoticeDocument.user).catch(() => null);

    if (Requester) {
      const DMDenialNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestDenied)
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}` })
        .setTitle("Leave of Absence — Extension Denial Notice")
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      DMDenialNotice.setDescription(
        Dedent(`
          Your leave of absence extension request, submitted on ${FormatTime(NoticeDocument.extension_request.date, "D")}, has been denied.          
          **The following note(s) were provided by the reviewer:**
          ${codeBlock("", NoticeDocument.extension_request.reviewer_notes || "N/A")}
        `)
      );

      Requester.send({ embeds: [DMDenialNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestDenied)
        .setTitle("Leave of Absence Extension Denial")
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}` })
        .addFields(
          {
            inline: true,
            name: "Request Info",
            value: Dedent(`
              **Requester:** ${userMention(NoticeDocument.user)}
              **Extension:** ${NoticeDocument.extended_duration_hr}
              **Reason:** ${NoticeDocument.extension_request.reason}
            `),
          },
          {
            inline: true,
            name: "Active LOA",
            value: Dedent(`
              **Duration:** ${NoticeDocument.duration_hr}
              **Started On:** ${FormatTime(NoticeDocument.review_date, "F")}
              **Ends On:** ${FormatTime(NoticeDocument.end_date, "D")} (not modified)
            `),
          },
          {
            inline: false,
            name: "Denial Info",
            value: Dedent(`
              **Denier**: ${userMention(NoticeDocument.extension_request.reviewed_by!.id)}
              **Notes:**
              ${NoticeDocument.extension_request.reviewer_notes || "`N/A`"}
            `),
          }
        );

      LogChannel.send({ embeds: [LogEmbed] }).catch(() => null);
    }

    if (NoticeDocument.extension_request?.request_msg) {
      const [ReqChannelId, ReqMsgId] = NoticeDocument.extension_request.request_msg.split(":");
      const RequestMessage = await Interaction.guild.channels
        .fetch(ReqChannelId)
        .then((Channel) => {
          if (!Channel?.isTextBased()) return null;
          return Channel as TextBasedChannel;
        })
        .then((Channel) => Channel?.messages.fetch(ReqMsgId))
        .catch(() => null);

      if (!RequestMessage) return;
      const RequestEmbed = this.GetRequestEmbed({
        NoticeDocument,
        Type: "Extension",
        Guild: Interaction.guild,
        CancellationDate: Interaction.createdAt,
      })
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestDenied)
        .setTitle("Denied Extension  |  Leave of Absence Request")
        .setFooter({
          iconURL: Interaction.user.displayAvatarURL(this.AvatarIconOpts),
          text: `Reference ID: ${NoticeDocument._id}; denied by @${Interaction.user.username} on`,
        });

      const RequestButtons = ActionRowBuilder.from<ButtonBuilder>(
        RequestMessage.components[0] as any
      );

      RequestButtons.components.forEach((Button) => Button.setDisabled(true));
      await RequestMessage.edit({ embeds: [RequestEmbed], components: [RequestButtons] }).catch(
        () => null
      );
    }
  }

  /**
   * Sends a log of a cancelled LOA extension (which wasn't already approved) to the logging channel, if one exists.
   * @param Interaction - The cancellation interaction received from the one who originally submitted the LOA.
   * @param NoticeDocument - The LOA document after being updated.
   * @returns A Promise that resolves after the edition of the request message if it exists.
   */
  public static async LogExtensionCancellation(
    Interaction: ButtonInteraction<"cached">,
    NoticeDocument: ANoticeDocument
  ) {
    if (!NoticeDocument.extension_request || !NoticeDocument.review_date) return;
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");
    const Requester = await Interaction.guild.members.fetch(NoticeDocument.user).catch(() => null);

    if (Requester && !NoticeDocument.extension_request.reviewed_by) {
      const DMCancellationNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestDenied)
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}` })
        .setTitle("Leave of Absence — Extension Cancellation Notice")
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      DMCancellationNotice.setDescription(
        Dedent(`
          Your previously submitted LOA extension request, with a duration of ${NoticeDocument.extended_duration_hr}, has been cancelled at your request. \
          Your currently active leave of absence will expire on ${FormatTime(NoticeDocument.end_date, "D")} as it was scheduled.
        `)
      );

      Requester.send({ embeds: [DMCancellationNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestCancelled)
        .setTitle("Leave of Absence Extension Cancellation")
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}; cancelled by requester on` })
        .addFields(
          {
            inline: true,
            name: "Request Info",
            value: Dedent(`
              **Requester:** ${userMention(NoticeDocument.user)}
              **Extension:** ${NoticeDocument.extended_duration_hr}
              **Reason:** ${NoticeDocument.extension_request.reason}
            `),
          },
          {
            inline: true,
            name: "Active LOA",
            value: Dedent(`
              **Duration:** ${NoticeDocument.duration_hr}
              **Started On:** ${FormatTime(NoticeDocument.review_date, "F")}
              **Ends On:** ${FormatTime(NoticeDocument.end_date, "D")} (not modified)
            `),
          }
        );

      LogChannel.send({ embeds: [LogEmbed] }).catch(() => null);
    }

    if (NoticeDocument.extension_request?.request_msg) {
      const [ReqChannelId, ReqMsgId] = NoticeDocument.extension_request.request_msg.split(":");
      const RequestMessage = await Interaction.guild.channels
        .fetch(ReqChannelId)
        .then((Channel) => {
          if (!Channel?.isTextBased()) return null;
          return Channel as TextBasedChannel;
        })
        .then((Channel) => Channel?.messages.fetch(ReqMsgId))
        .catch(() => null);

      if (!RequestMessage) return;
      const RequestEmbed = this.GetRequestEmbed({
        NoticeDocument,
        Type: "Extension",
        Guild: Interaction.guild,
        CancellationDate: Interaction.createdAt,
      })
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestDenied)
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}; cancelled by requester on` })
        .setTitle("Cancelled Extension  |  Leave of Absence Request");

      const RequestButtons = ActionRowBuilder.from<ButtonBuilder>(
        RequestMessage.components[0] as any
      );

      RequestButtons.components.forEach((Button) => Button.setDisabled(true));
      await RequestMessage.edit({ embeds: [RequestEmbed], components: [RequestButtons] }).catch(
        () => null
      );
    }
  }

  /**
   * Sends a log of a cancelled LOA extension to the logging channel, if one exists. Also sends a DM notice to the requester if it is possible.
   * This function is not for logging manual end (i.e. management staff end commands).
   * @param Client
   * @param NoticeDocument - The LOA document taking action based on.
   *                      Required fields are: `_id`, `review_date`, `reviewed_by`, `status`, `end_date`, `user`, `guild`, and `duration_hr`.
   * @param CurrentDate - The current date which will be used to determine if the LOA has ended.
   * @returns A Promise resolves to the sent log message if successful.
   * @silent This function will try not to throw any errors when executed.
   */
  public static async LogLeaveEnd(
    Client: DiscordClient,
    NoticeDocument: ANoticeDocument,
    CurrentDate: Date = new Date()
  ) {
    if (
      NoticeDocument.review_date === null ||
      NoticeDocument.status !== "Approved" ||
      isAfter(NoticeDocument.end_date, CurrentDate)
    ) {
      return;
    }

    const Guild = await Client.guilds.fetch(NoticeDocument.guild).catch(() => null);
    const Requester = await Guild?.members.fetch(NoticeDocument.user).catch(() => null);

    if (Guild && Requester) {
      const DMNotice = new EmbedBuilder()
        .setTimestamp(NoticeDocument.end_date)
        .setColor(Embeds.Colors.LOARequestEnded)
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}` })
        .setTitle("Leave of Absence — End Notice")
        .setDescription(
          Dedent(`
            Your leave of absence, which began on ${FormatTime(NoticeDocument.review_date, "D")} (${FormatTime(NoticeDocument.review_date, "R")}), has \
            ended and you are no longer on leave. If you need to request a new leave, please use the \`/loa request\` command on the server.
          `)
        )
        .setAuthor({
          name: Guild.name,
          iconURL:
            Client.guilds.cache.get(NoticeDocument.guild)?.iconURL({ size: 128 }) ??
            Embeds.Thumbs.Transparent,
        });

      Requester.send({ embeds: [DMNotice] }).catch(() => null);
    }

    if (Guild) {
      const LogChannel = await this.GetLoggingChannel(Guild, "log");
      if (LogChannel) {
        const LogEmbed = new EmbedBuilder()
          .setTimestamp(NoticeDocument.end_date)
          .setColor(Embeds.Colors.LOARequestEnded)
          .setTitle("Leave of Absence Ended")
          .setFooter({ text: `Reference ID: ${NoticeDocument._id}; ended on` })
          .addFields(
            {
              inline: true,
              name: "Leave Info",
              value: Dedent(`
              **Requester:** ${userMention(NoticeDocument.user)}
              **Duration:** ${NoticeDocument.duration_hr}
              **Started On:** ${FormatTime(NoticeDocument.review_date, "F")}
              **Leave Reason:** ${NoticeDocument.reason}
            `),
            },
            {
              inline: true,
              name: "Approval Info",
              value: Dedent(`
                **Approver**: ${userMention(NoticeDocument.reviewed_by!.id)}
                **Notes:**
                ${NoticeDocument.reviewer_notes || "`N/A`"}
              `),
            }
          );

        return LogChannel.send({ embeds: [LogEmbed] }).catch(() => null);
      }
    }
  }

  /**
   * Logs an early leave end upon the management staff or the requester request to the logging channel and sends a DM notice to the requester.
   * @param Interaction - The interaction received from the management staff or the requester to early end the LOA.
   * @param NoticeDocument - The ended leave.
   */
  public static async LogEarlyLeaveEnd(
    Interaction: ManagementInteraction,
    NoticeDocument: ANoticeDocument,
    EndRequestBy: "Management" | "Requester"
  ) {
    if (!NoticeDocument.review_date) return;
    const LogChannel = await this.GetLoggingChannel(Interaction.guild, "log");
    const Requester = await Interaction.guild.members.fetch(NoticeDocument.user).catch(() => null);

    if (Requester) {
      const DMNotice = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestEnded)
        .setTitle("Leave of Absence — End Notice")
        .setAuthor({
          name: Interaction.guild.name,
          iconURL: Interaction.guild.iconURL({ size: 128 }) ?? Embeds.Thumbs.Transparent,
        });

      if (EndRequestBy === "Requester") {
        DMNotice.setDescription(
          Dedent(`
            Your leave of absence, originally scheduled to end on ${FormatTime(NoticeDocument.end_date, "D")} (${FormatTime(NoticeDocument.end_date, "R")}), has \
            been terminated (ended) early upon your request. If you need to request a new leave, please use the \`/loa request\` command on the server.
          `)
        ).setFooter({
          text: `Reference ID: ${NoticeDocument._id}`,
        });
      } else {
        DMNotice.setDescription(
          Dedent(`
            Your leave of absence, originally scheduled to end on ${FormatTime(NoticeDocument.end_date, "D")} (${FormatTime(NoticeDocument.end_date, "R")}), has \
            been terminated (ended) early by management. If you need to request a new leave, please use the \`/loa request\` command on the server.
          `)
        ).setFooter({
          text: `Reference ID: ${NoticeDocument._id}; ended by: @${Interaction.user.username}`,
        });

        if (NoticeDocument.early_end_reason) {
          DMNotice.setDescription(
            DMNotice.data.description +
              `\n\n**Reason Provided by Management:**\n${codeBlock("", NoticeDocument.early_end_reason)}`
          );
        }
      }

      Requester.send({ embeds: [DMNotice] }).catch(() => null);
    }

    if (LogChannel) {
      const LogEmbed = new EmbedBuilder()
        .setTimestamp(Interaction.createdAt)
        .setColor(Embeds.Colors.LOARequestEnded)
        .setTitle("Leave of Absence Ended")
        .setFooter({ text: `Reference ID: ${NoticeDocument._id}; ended early on` })
        .addFields({
          inline: true,
          name: "Leave Info",
          value: Dedent(`
              **Requester:** ${userMention(NoticeDocument.user)}
              **Org. Duration:** ${NoticeDocument.original_duration_hr}
              **Leave Duration:** ${NoticeDocument.duration_hr}
              **Started On:** ${FormatTime(NoticeDocument.review_date, "F")}
              **Scheduled to End On:** ${FormatTime(NoticeDocument.end_date, "D")}
              **Leave Reason:** ${NoticeDocument.reason}
            `),
        });

      if (EndRequestBy === "Requester") {
        LogEmbed.addFields({
          inline: true,
          name: "Approval Info",
          value: Dedent(`
            **Approver:** ${userMention(NoticeDocument.reviewed_by!.id)}
            **Notes:**
            ${NoticeDocument.reviewer_notes || "`N/A`"}
          `),
        });
      } else {
        LogEmbed.addFields({
          inline: true,
          name: "Management Staff",
          value: Dedent(`
            **Approver:** ${userMention(NoticeDocument.reviewed_by!.id)}
            **Approver Notes:** ${NoticeDocument.reviewer_notes || "`N/A`"}

            **Ended By:** ${userMention(Interaction.user.id)}
            **End Reason:** ${NoticeDocument.early_end_reason || "`N/A`"}
          `),
        });
      }

      LogChannel.send({ embeds: [LogEmbed] }).catch(() => null);
    }
  }

  /**
   * @param MgmtInteract - The received management interaction (button/cmd).
   * @param WipeResult - The deletion result of mongoose/mongodb.
   * @param RecordsStatus - The status of the records.
   * @param TargettedUser - An optional parameter to only specify a targetted user.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogLOAsWipe(
    MgmtInteract: BaseInteraction<"cached"> | GuildMember,
    WipeResult: Mongoose.mongo.DeleteResult & { recordsAfter?: Date; recordsBefore?: Date },
    RecordsStatus?: string,
    TargettedUser?: User
  ) {
    const LoggingChannel = await this.GetLoggingChannel(MgmtInteract.guild, "log");
    const LogEmbed = new EmbedBuilder()
      .setColor(Embeds.Colors.LOARequestCancelled)
      .setTitle(TargettedUser ? "Member LOA Records Wiped" : "LOA Records Wiped")
      .setFooter({ text: `Wiped by: @${MgmtInteract.user.username} on` })
      .setDescription(
        Dedent(`
          ${TargettedUser ? `**Member:** <@${TargettedUser.id}>` : ""}
          **Records Deleted:** ${WipeResult.deletedCount}
          **Records of Status:** ${RecordsStatus || "*All Statuses*"}
        `)
      );

    if (!(MgmtInteract instanceof GuildMember)) {
      LogEmbed.setTimestamp(MgmtInteract.createdAt);
    }

    if (WipeResult.recordsAfter) {
      LogEmbed.setDescription(
        `${LogEmbed.data.description}\n**Records After:** ${FormatTime(WipeResult.recordsAfter, "D")}`
      );
    } else if (WipeResult.recordsBefore) {
      LogEmbed.setDescription(
        `${LogEmbed.data.description}\n**Records Before:** ${FormatTime(WipeResult.recordsBefore, "D")}`
      );
    }

    return LoggingChannel?.send({ embeds: [LogEmbed] });
  }
}
