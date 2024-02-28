/* eslint-disable sonarjs/no-duplicate-string */
// ------------------------------------------------------------------------------------

import {
  User,
  Guild,
  inlineCode,
  channelLink,
  userMention,
  GuildMember,
  EmbedBuilder,
  ImageURLOptions,
  TextBasedChannel,
  ButtonInteraction,
  time as FormatTime,
  AnySelectMenuInteraction,
  ModalSubmitInteraction,
} from "discord.js";

import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { App as DiscordApp } from "@DiscordApp";
import SharedData, { Embeds } from "@Config/Shared.js";
import GuildModel from "@Models/Guild.js";
import HDuration from "humanize-duration";
import Dedent from "dedent";

const BluewishText = (Text: string | number, ChannelId: string) => {
  return `[${Text}](${channelLink(ChannelId)})`;
};

const ReadableDuration = HDuration.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

// ------------------------------------------------------------------------------------
// Class Definition:
// -----------------

type ShiftLogAction = "start" | "break-start" | "break-end" | "end" | "auto-end" | "wipe";
type HydratedShiftDocument = ExtraTypings.HydratedShiftDocument;
type DiscordUserInteract =
  | SlashCommandInteraction<"cached">
  | AnySelectMenuInteraction<"cached">
  | ModalSubmitInteraction<"cached">
  | ButtonInteraction<"cached">
  | GuildMember;

export default class ShiftActionLogger {
  private static readonly AvatarIconOpts: ImageURLOptions = { size: 128 };

  /**
   * Fetches the shift actions logging channel for a specific guild.
   * @param Guild
   * @returns
   */
  private static async GetLoggingChannel(Guild: Guild) {
    const LoggingChannelId = await GuildModel.findById(Guild.id)
      .select("settings")
      .then((GuildDoc) => {
        if (GuildDoc) {
          return GuildDoc.settings.log_channels.shift_activities;
        }
        return null;
      });

    if (!LoggingChannelId) return null;
    const ChannelExists = Guild.channels.cache.get(LoggingChannelId);
    const AbleToSendMsgs =
      ChannelExists?.viewable &&
      ChannelExists.isTextBased() &&
      ChannelExists.permissionsFor(await Guild.members.fetchMe())?.has("SendMessages");

    return AbleToSendMsgs === true ? (ChannelExists as TextBasedChannel) : null;
  }

  /**
   * Base data for a target member (inferred from the shift document and command interactions).
   * @param ShiftDoc - The latest/updated shift document.
   * @param TUserInfo - The target user's information (user id and guild id).
   * @returns
   */
  private static async GetBaseData(
    ShiftDoc: HydratedShiftDocument,
    TUserInfo: GuildMember | { user_id: string; guild_id: string }
  ) {
    const Guild =
      TUserInfo instanceof GuildMember
        ? TUserInfo.guild
        : await DiscordApp.guilds.fetch(TUserInfo.guild_id);
    const UserInGuild =
      TUserInfo instanceof GuildMember ? TUserInfo : await Guild.members.fetch(TUserInfo.user_id);

    const UserAvatarURL = UserInGuild.user.displayAvatarURL(this.AvatarIconOpts);
    const CurrNickname = UserInGuild.nickname ?? UserInGuild.user.displayName;
    const LoggingChannel = await this.GetLoggingChannel(Guild);
    const ShiftStartedRT = FormatTime(Math.round(ShiftDoc.start_timestamp.valueOf() / 1000), "R");
    const ShiftEndedRT = ShiftDoc.end_timestamp
      ? FormatTime(Math.round(ShiftDoc.end_timestamp.valueOf() / 1000), "R")
      : null;

    const BaseEmbed = new EmbedBuilder().setAuthor({
      iconURL: UserAvatarURL,
      name: `@${UserInGuild.user.username}`,
    });

    return { BaseEmbed, LoggingChannel, ShiftStartedRT, ShiftEndedRT, CurrNickname };
  }

  /**
   * Adds additional text before the existing footer text.
   * @param Embed
   * @param AdditionalText
   * @returns
   */
  private static BeforeFooter(Embed: EmbedBuilder, AdditionalText: string): EmbedBuilder {
    if (Embed.data.footer?.text && Embed.data.footer.text.length > 0) {
      return Embed.setFooter({ text: `${AdditionalText}; ${Embed.data.footer.text}` });
    } else {
      return Embed.setFooter({ text: AdditionalText });
    }
  }

  /**
   * Logs a specific shift action to the appropriate and specified channel of a guild.
   * Note: this function automatically checks if the channel is viewable and if the bot has
   * the necessary permissions to send messages on it. It also silently ignore sending messages
   * if the conditions are not met (no view/send perms) without throwing an error.
   * @param Action - The shift action to log.
   * @param UserInteract - Interaction of the user who triggered the shift action.
   * @param ShiftDoc - The latest/updated shift document.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async Log(
    Action: Exclude<ShiftLogAction, "wipe">,
    UserInteract: DiscordUserInteract,
    ShiftDoc: HydratedShiftDocument
  ) {
    if (Action === "start") {
      return this.LogShiftStart(ShiftDoc, UserInteract);
    } else if (Action === "break-end") {
      return this.LogShiftBreakEnd(ShiftDoc, UserInteract);
    } else if (Action === "break-start") {
      return this.LogShiftBreakStart(ShiftDoc, UserInteract);
    } else if (Action === "end") {
      return this.LogShiftEnd(ShiftDoc, UserInteract);
    } else {
      return this.LogShiftAutomatedEnd(ShiftDoc, UserInteract, "Unknown");
    }
  }

  /**
   * Logs a shift start action to the appropriate and specified channel of a guild.
   * @param ShiftDoc - The latest/updated shift document.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param [AdminUser] - The user who ended the shift, if any.
   * @param [TargetUser] - The user whose shift was ended, if any. Should be passed if `AdminUser` is also passed.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftStart(
    ShiftDoc: HydratedShiftDocument,
    UserInteract: DiscordUserInteract,
    AdminUser?: User,
    TargetUser?: User
  ) {
    const BaseData = await this.GetBaseData(ShiftDoc, {
      user_id: ShiftDoc.user,
      guild_id: UserInteract.guild.id,
    });

    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Started")
      .setColor(SharedData.Embeds.Colors.ShiftStart)
      .setFields(
        {
          inline: true,
          name: "Shift Details",
          value: Dedent(`
            - Shift ID: \`${ShiftDoc._id}\`
              - Type: \`${ShiftDoc.type}\`
              - Started: ${BaseData.ShiftStartedRT}
          `),
        },
        {
          inline: true,
          name: "Officer Details",
          value: Dedent(`
            - Officer: ${userMention(ShiftDoc.user)}
            - Nickname: ${inlineCode(BaseData.CurrNickname)}
          `),
        }
      );

    if (AdminUser) {
      this.BeforeFooter(LogEmbed, `Started by: @${AdminUser.username}`);
    }

    if (TargetUser) {
      LogEmbed.setAuthor({
        name: `@${TargetUser.username}`,
        iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
      });
    }

    return BaseData.LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift break start action to the appropriate and specified channel of a guild.
   * @param ShiftDoc - The latest/updated shift document.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param [AdminUser] - The user who ended the shift, if any.
   * @param [TargetUser] - The user whose shift was ended, if any. Should be passed if `AdminUser` is also passed.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftBreakStart(
    ShiftDoc: HydratedShiftDocument,
    UserInteract: DiscordUserInteract,
    AdminUser?: User,
    TargetUser?: User
  ) {
    const BaseData = await this.GetBaseData(ShiftDoc, {
      user_id: ShiftDoc.user,
      guild_id: UserInteract.guild.id,
    });

    const BreakStartedRT = FormatTime(Math.round(ShiftDoc.events.breaks[0]![0] / 1000), "R");
    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Break Started")
      .setColor(SharedData.Embeds.Colors.ShiftBreak)
      .setFields(
        {
          inline: true,
          name: "Shift Details",
          value: Dedent(`
            - Shift ID: \`${ShiftDoc._id}\`
              - Type: \`${ShiftDoc.type}\`
              - Shift Started: ${BaseData.ShiftStartedRT}
              - Break Started: ${BreakStartedRT}
          `),
        },
        {
          inline: true,
          name: "Officer Details",
          value: Dedent(`
            - Officer: ${userMention(ShiftDoc.user)}
            - Nickname: ${inlineCode(BaseData.CurrNickname)}
          `),
        }
      );

    if (AdminUser) {
      LogEmbed.setFooter({
        text: `Started by: @${AdminUser.username}; ${LogEmbed.data.footer?.text}`,
      });
    }

    if (TargetUser) {
      LogEmbed.setAuthor({
        name: `@${TargetUser.username}`,
        iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
      });
    }

    return BaseData.LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift break end action to the appropriate and specified channel of a guild.
   * @param ShiftDoc - The latest/updated shift document.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param [AdminUser] - The user who ended the shift, if any.
   * @param [TargetUser] - The user whose shift was ended, if any. Should be passed if `AdminUser` is also passed.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftBreakEnd(
    ShiftDoc: HydratedShiftDocument,
    UserInteract: DiscordUserInteract,
    AdminUser?: User,
    TargetUser?: User
  ) {
    const BaseData = await this.GetBaseData(ShiftDoc, {
      user_id: ShiftDoc.user,
      guild_id: UserInteract.guild.id,
    });

    const EndedBreak = ShiftDoc.events.breaks.findLast(() => true) as number[];
    const BreakStartedRT = FormatTime(Math.round(EndedBreak[0] / 1000), "R");
    const EndedBreakTime = ReadableDuration(EndedBreak[1] - EndedBreak[0]);
    const AllBreakTime = ReadableDuration(ShiftDoc.durations.on_break);
    const AllBTEqualsEndedBreak = ShiftDoc.durations.on_break === EndedBreak[1] - EndedBreak[0];

    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Break Ended")
      .setColor(SharedData.Embeds.Colors.ShiftBreak)
      .setFields(
        {
          inline: true,
          name: "Shift Details",
          value: Dedent(`
            - Shift ID: \`${ShiftDoc._id}\`
              - Type: \`${ShiftDoc.type}\`
              - Shift Started: ${BaseData.ShiftStartedRT}
              - Break Started: ${BreakStartedRT}
              - Break Time: ${EndedBreakTime}
              ${AllBTEqualsEndedBreak ? "" : `- All Break Time: ${AllBreakTime}`}
          `),
        },
        {
          inline: true,
          name: "Officer Details",
          value: Dedent(`
            - Officer: ${userMention(ShiftDoc.user)}
            - Nickname: ${inlineCode(BaseData.CurrNickname)}
          `),
        }
      );

    if (AdminUser) {
      LogEmbed.setFooter({
        text: `Ended by: @${AdminUser.username}; ${LogEmbed.data.footer?.text}`,
      });
    }

    if (TargetUser) {
      LogEmbed.setAuthor({
        name: `@${TargetUser.username}`,
        iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
      });
    }

    return BaseData.LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift end action to the appropriate and specified channel of a guild.
   * @param ShiftDoc - The latest/updated shift document.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param [AdminUser] - The user who ended the shift, if any.
   * @param [TargetUser] - The user whose shift was ended, if any. Should be passed if `AdminUser` is also passed.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftEnd(
    ShiftDoc: HydratedShiftDocument,
    UserInteract: DiscordUserInteract,
    AdminUser?: User,
    TargetUser?: User
  ) {
    const BaseData = await this.GetBaseData(ShiftDoc, {
      user_id: ShiftDoc.user,
      guild_id: UserInteract.guild.id,
    });

    const OnDutyTime = ReadableDuration(ShiftDoc.durations.on_duty);
    const OnBreakTime =
      ShiftDoc.durations.on_break > 0 ? ReadableDuration(ShiftDoc.durations.on_break) : null;

    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Ended")
      .setColor(SharedData.Embeds.Colors.ShiftEnd)
      .addFields(
        {
          inline: true,
          name: "Officer Details",
          value: Dedent(`
            - Officer: ${userMention(ShiftDoc.user)}
            - Nickname: ${inlineCode(BaseData.CurrNickname)}
          `),
        },
        {
          inline: true,
          name: "Activities",
          value: Dedent(`
            Arrests Made: ${BluewishText(ShiftDoc.events.arrests, BaseData.LoggingChannel?.id ?? UserInteract.guild.id)}
            Citations Issued: ${BluewishText(ShiftDoc.events.citations, BaseData.LoggingChannel?.id ?? UserInteract.guild.id)}
          `),
        },
        {
          inline: false,
          name: "Shift Details",
          value: Dedent(`
            - Shift ID: \`${ShiftDoc._id}\`
              - Type: \`${ShiftDoc.type}\`
              - Started: ${BaseData.ShiftStartedRT}
              - Ended: ${BaseData.ShiftEndedRT ?? "*N/A*"}
              - On-Duty Time: ${OnDutyTime}
              ${OnBreakTime ? `- On-Break Time: ${OnBreakTime}` : ""}
          `),
        }
      );

    if (AdminUser) {
      this.BeforeFooter(LogEmbed, `Ended by: @${AdminUser.username}`);
    }

    if (TargetUser) {
      LogEmbed.setAuthor({
        name: `@${TargetUser.username}`,
        iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
      });
    }

    return BaseData.LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift end action to the appropriate and specified channel of a guild.
   * @param ShiftDoc - The latest/updated shift document.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param EndReason - The reason for the shift being automatically ended.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftAutomatedEnd(
    ShiftDoc: HydratedShiftDocument,
    UserInteract: DiscordUserInteract,
    EndReason: string
  ) {
    const BaseData = await this.GetBaseData(ShiftDoc, {
      user_id: ShiftDoc.user,
      guild_id: UserInteract.guild.id,
    });

    const OnDutyTime = ReadableDuration(ShiftDoc.durations.on_duty);
    const OnBreakTime = ShiftDoc.durations.on_duty
      ? ReadableDuration(ShiftDoc.durations.on_break)
      : null;

    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Automatically Ended")
      .setColor(SharedData.Embeds.Colors.ShiftEnd)
      .addFields(
        {
          inline: true,
          name: "Officer Details",
          value: Dedent(`
            - Officer: ${userMention(ShiftDoc.user)}
            - Nickname: ${inlineCode(BaseData.CurrNickname)}
          `),
        },
        {
          inline: true,
          name: "Activities",
          value: Dedent(`
            Arrests Made: ${BluewishText(ShiftDoc.events.arrests, BaseData.LoggingChannel?.id ?? UserInteract.guild.id)}
            Citations Issued: ${BluewishText(ShiftDoc.events.citations, BaseData.LoggingChannel?.id ?? UserInteract.guild.id)}
          `),
        },
        {
          inline: false,
          name: "Shift Details",
          value: Dedent(`
            - Shift ID: \`${ShiftDoc._id}\`
              - Type: \`${ShiftDoc.type}\`
              - Started: ${BaseData.ShiftStartedRT}
              - Ended: ${BaseData.ShiftEndedRT ?? "*N/A*"}
              - On-Duty Time: ${OnDutyTime}
              ${OnBreakTime ? `- On-Break Time: ${OnBreakTime}` : ""}
              - End Reason: \`${EndReason}\`
          `),
        }
      );

    return BaseData.LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift void action to the appropriate and specified channel of a guild.
   * @param ShiftDoc - The latest/updated shift document.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param [AdminUser] - The user who voided the shift, if any.
   * @param [TargetUser] - The user whose shift was voided, if any. Should be passed if `AdminUser` is also passed.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftVoid(
    ShiftDoc: HydratedShiftDocument,
    UserInteract: Exclude<DiscordUserInteract, GuildMember>,
    AdminUser?: User,
    TargetUser?: User
  ) {
    const BaseData = await this.GetBaseData(ShiftDoc, {
      user_id: ShiftDoc.user,
      guild_id: UserInteract.guildId,
    });

    const VoidEpoch = FormatTime(UserInteract.createdAt, "R");
    const OnDutyTime = ReadableDuration(ShiftDoc.durations.on_duty);
    const OnBreakTime =
      ShiftDoc.durations.on_break > 0 ? ReadableDuration(ShiftDoc.durations.on_break) : null;

    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Voided")
      .setColor(SharedData.Embeds.Colors.ShiftVoid)
      .addFields(
        {
          inline: true,
          name: "Officer Details",
          value: Dedent(`
            - Officer: ${userMention(ShiftDoc.user)}
            - Nickname: ${inlineCode(BaseData.CurrNickname)}
          `),
        },
        {
          inline: true,
          name: "Activities",
          value: Dedent(`
            Arrests Made: ${BluewishText(ShiftDoc.events.arrests, BaseData.LoggingChannel?.id ?? UserInteract.guild.id)}
            Citations Issued: ${BluewishText(ShiftDoc.events.citations, BaseData.LoggingChannel?.id ?? UserInteract.guild.id)}
          `),
        },
        {
          inline: false,
          name: "Shift Details",
          value: Dedent(`
            - Shift ID: \`${ShiftDoc._id}\`
              - Type: \`${ShiftDoc.type}\`
              - Started: ${BaseData.ShiftStartedRT}
              - Voided: ${BaseData.ShiftEndedRT ?? VoidEpoch}
              - On-Duty Time: ${OnDutyTime}
              ${OnBreakTime ? `- On-Break Time: ${OnBreakTime}` : ""}
          `),
        }
      );

    if (AdminUser) {
      this.BeforeFooter(LogEmbed, `Voided by: @${AdminUser.username}`);
    }

    if (TargetUser) {
      LogEmbed.setAuthor({
        name: `@${TargetUser.username}`,
        iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
      });
    }

    return BaseData.LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift wipe-all action to the appropriate and specified channel of a guild.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param DeleteResult - The deletion result of mongoose/mongodb.
   * @param ShiftType - Type of shifts that were deleted; defaults to `null` which translates into `*All Types*`.
   * @param TargettedUser - An optional parameter to only specify a targetted user.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftsWipe(
    UserInteract: DiscordUserInteract,
    DeleteResult: Mongoose.mongo.DeleteResult & { totalTime: number },
    ShiftType?: string | null,
    TargettedUser?: User
  ) {
    const LoggingChannel = await this.GetLoggingChannel(UserInteract.guild);
    const LogEmbed = new EmbedBuilder()
      .setColor(Embeds.Colors.ShiftEnd)
      .setTitle(TargettedUser ? "Member Shifts Wiped" : "Shifts Wiped")
      .setFooter({ text: `Wiped by: @${UserInteract.user.username}` })
      .setDescription(
        Dedent(`
          ${TargettedUser ? `**Member:** <@${TargettedUser.id}>` : ""}
          **Shifts Deleted:** \`${DeleteResult.deletedCount}\`
          **Shifts of Type:** ${ShiftType ? `\`${ShiftType}\`` : "*All Shift Types*"}
          **On-Duty Time:** ${DeleteResult.totalTime ? ReadableDuration(DeleteResult.totalTime) : "*N/A*"}
        `)
      );

    if (!(UserInteract instanceof GuildMember)) {
      LogEmbed.setTimestamp(UserInteract.createdAt);
    }

    return LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift delete action done by an administrative user to the appropriate and specified channel of a guild.
   * @param UserInteract - The received discordjs interaction (button/cmd) from the admin user.
   * @param ShiftDeleted - ...
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftDelete(
    UserInteract: Exclude<DiscordUserInteract, GuildMember>,
    ShiftDeleted: HydratedShiftDocument
  ) {
    const LoggingChannel = await this.GetLoggingChannel(UserInteract.guild);
    const LogEmbed = new EmbedBuilder()
      .setTimestamp(UserInteract.createdAt)
      .setColor(Embeds.Colors.ShiftEnd)
      .setTitle("Member Shift Deleted")
      .setFooter({ text: `Deleted by: @${UserInteract.user.username}` })
      .setDescription(
        Dedent(`
          **Member:** <@${ShiftDeleted.user}>
          **Shift ID:** \`${ShiftDeleted._id}\`
          **Shift of Type:** \`${ShiftDeleted.type}\`
          **On-Duty Time:** ${ReadableDuration(ShiftDeleted.durations.on_duty)}
          ${ShiftDeleted.durations.on_break ? `**On-Break Time:** ${ReadableDuration(ShiftDeleted.durations.on_break)}` : ""}
        `)
      );

    return LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift time set action done by an administrative user to the appropriate and specified channel of a guild.
   * @param UserInteract - The received discordjs interaction (button/cmd) from the admin user.
   * @param OldShiftDoc - The old shift document with old durations.
   * @param ShiftUpdated - ...
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftTimeSet(
    UserInteract: Exclude<DiscordUserInteract, GuildMember>,
    OldShiftDoc: HydratedShiftDocument,
    ShiftUpdated: HydratedShiftDocument
  ) {
    const LoggingChannel = await this.GetLoggingChannel(UserInteract.guild);
    const LogEmbed = new EmbedBuilder()
      .setTimestamp(UserInteract.createdAt)
      .setColor(Embeds.Colors.ShiftEnd)
      .setTitle("Shift Modified — Time Set")
      .setFooter({ text: `Set by: @${UserInteract.user.username}` })
      .setDescription(
        Dedent(`
          **Member:** <@${ShiftUpdated.user}>
          **Shift ID:** \`${ShiftUpdated._id}\`
          **Shift of Type:** \`${ShiftUpdated.type}\`
          **Previous On-Duty Time:** ${ReadableDuration(OldShiftDoc.durations.on_duty)}
          **Set On-Duty Time:** ${ShiftUpdated.durations.on_duty}
          ${ShiftUpdated.hasBreaks() ? `**On-Break Time:** ${ReadableDuration(ShiftUpdated.durations.on_break)}` : ""}
        `)
      );

    return LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift time reset action done by an administrative user to the appropriate and specified channel of a guild.
   * @param UserInteract - The received discordjs interaction (button/cmd) from the admin user.
   * @param OldShiftDoc - The old shift document with old durations.
   * @param ShiftUpdated - ...
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftTimeReset(
    UserInteract: Exclude<DiscordUserInteract, GuildMember>,
    OldShiftDoc: HydratedShiftDocument,
    ShiftUpdated: HydratedShiftDocument
  ) {
    const LoggingChannel = await this.GetLoggingChannel(UserInteract.guild);
    const LogEmbed = new EmbedBuilder()
      .setTimestamp(UserInteract.createdAt)
      .setColor(Embeds.Colors.ShiftEnd)
      .setTitle("Shift Modified — Time Reset")
      .setFooter({ text: `Reset by: @${UserInteract.user.username}` })
      .setDescription(
        Dedent(`
          **Member:** <@${ShiftUpdated.user}>
          **Shift ID:** \`${ShiftUpdated._id}\`
          **Shift of Type:** \`${ShiftUpdated.type}\`
          **Current On-Duty Time:** ${ReadableDuration(ShiftUpdated.durations.on_duty)}
          **Previous On-Duty Time:** ${ReadableDuration(OldShiftDoc.durations.on_duty)}
          ${ShiftUpdated.hasBreaks() ? `**On-Break Time:** ${ReadableDuration(ShiftUpdated.durations.on_break)}` : ""}
        `)
      );

    return LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift time add/subtract action done by an administrative user to the appropriate and specified channel of a guild.
   * @param UserInteract - The received discordjs interaction (button/cmd) from the admin user.
   * @param ShiftModified - ...
   * @param TimeAddedSub - The time which has been added/subtracted in milliseconds.
   * @param ActionType - The action taken on the shift; either adding or subtracting.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftTimeAddSub(
    UserInteract: Exclude<DiscordUserInteract, GuildMember>,
    ShiftModified: HydratedShiftDocument,
    TimeAddedSub: number,
    ActionType: "Add" | "Subtract"
  ) {
    const LoggingChannel = await this.GetLoggingChannel(UserInteract.guild);
    const LogEmbed = new EmbedBuilder()
      .setTimestamp(UserInteract.createdAt)
      .setFooter({ text: `Modified by: @${UserInteract.user.username}` })
      .setDescription(
        Dedent(`
          **Member:** <@${ShiftModified.user}>
          **Shift ID:** \`${ShiftModified._id}\`
          **Shift of Type:** \`${ShiftModified.type}\`
          **Time ${ActionType}ed:** ${ReadableDuration(TimeAddedSub)}
          **On-Duty Time:** ${ReadableDuration(ShiftModified.durations.on_duty)}
          ${ShiftModified.hasBreaks() ? `**On-Break Time:** ${ReadableDuration(ShiftModified.durations.on_break)}` : ""}
        `)
      );

    if (ActionType === "Add") {
      LogEmbed.setTitle("Shift Modified — Time Add");
      LogEmbed.setColor(Embeds.Colors.ShiftStart);
    } else {
      LogEmbed.setTitle("Shift Modified — Time Subtract");
      LogEmbed.setColor(Embeds.Colors.ShiftEnd);
    }

    return LoggingChannel?.send({ embeds: [LogEmbed] });
  }
}
