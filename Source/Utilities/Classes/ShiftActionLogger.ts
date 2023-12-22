import {
  User,
  EmbedBuilder,
  ImageURLOptions,
  TextBasedChannel,
  ButtonInteraction,
  time as FormatTime,
} from "discord.js";

import { ExtraTypings } from "@Typings/Utilities/Database.js";
import SharedData, { Embeds } from "@Config/Shared.js";
import GuildModel from "@Models/Guild.js";
import HDuration from "humanize-duration";
import Dedent from "dedent";

const ReadableDuration = HDuration.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

// ------------------------------------------------------------------------------------
// Class Definition:
// -----------------

type ShiftLogAction = "start" | "break-start" | "break-end" | "end" | "auto-end" | "wipe";
type DiscordUserInteract = SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">;
type HydratedShiftDocument = ExtraTypings.HydratedShiftDocument;

// TODO: Add support for logging administration actions on shifts.
export default class ShiftActionLogger {
  private static readonly AvatarIconOpts: ImageURLOptions = { size: 128 };

  /**
   * Fetches the shift actions logging channel for a specific guild (Guild Id is retrieved from the user interaction).
   * @param UserInteract
   * @returns
   */
  private static async GetLoggingChannel(UserInteract: DiscordUserInteract) {
    const ChannelId = await GuildModel.findOne({
      _id: UserInteract.guildId,
    })
      .select("settings")
      .then((GuildDoc) => {
        if (GuildDoc) {
          return GuildDoc.settings.log_channels.shift_activities;
        }
        return null;
      });

    if (!ChannelId) return null;
    const ChannelExists = await UserInteract.guild.channels.fetch(ChannelId);
    const AbleToSendMsgs =
      ChannelExists?.viewable &&
      ChannelExists.isTextBased() &&
      ChannelExists.permissionsFor(UserInteract.client.user.id)?.has("SendMessages");

    return AbleToSendMsgs === true ? (ChannelExists as TextBasedChannel) : null;
  }

  /**
   * Base data for all class methods.
   * @param ShiftDoc - The latest/updated shift document.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @returns An object with the properties: `BaseEmbed`, `LoggingChannel`, and `ShiftStartedRT`.
   */
  private static async GetBaseData(
    ShiftDoc: HydratedShiftDocument,
    UserInteract: DiscordUserInteract
  ) {
    const UserAvatarURL = UserInteract.user.displayAvatarURL(this.AvatarIconOpts);
    const LoggingChannel = await this.GetLoggingChannel(UserInteract);
    const ShiftStartedRT = FormatTime(Math.round(ShiftDoc.start_timestamp.valueOf() / 1000), "R");
    const BaseEmbed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `Shift ID: ${ShiftDoc._id}` })
      .setAuthor({
        iconURL: UserAvatarURL,
        name: `@${UserInteract.user.username}`,
      });

    return { BaseEmbed, LoggingChannel, ShiftStartedRT };
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
    const BaseData = await this.GetBaseData(ShiftDoc, UserInteract);
    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Started")
      .setColor(SharedData.Embeds.Colors.ShiftStart)
      .setDescription(
        Dedent(`
            **Officer:** <@${ShiftDoc.user}>
            **Started:** ${FormatTime(Math.round(ShiftDoc.start_timestamp.valueOf() / 1000), "R")}
            **Shift Type:** \`${ShiftDoc.type}\`
          `)
      );

    if (AdminUser) {
      LogEmbed.setFooter({
        text: `Started by: @${AdminUser.username}; ${LogEmbed.data.footer?.text}`,
      });

      if (TargetUser) {
        LogEmbed.setAuthor({
          name: `@${TargetUser.username}`,
          iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
        });
      }
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
    const BaseData = await this.GetBaseData(ShiftDoc, UserInteract);
    const BreakStartedRT = FormatTime(Math.round(ShiftDoc.events.breaks[0]![0] / 1000), "R");
    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Break Started")
      .setColor(SharedData.Embeds.Colors.ShiftBreak)
      .setDescription(
        Dedent(`
              **Officer:** <@${ShiftDoc.user}>
              **Shift Started:** ${BaseData.ShiftStartedRT}
              **Break Started:** ${BreakStartedRT}
              **Shift Type:** \`${ShiftDoc.type}\`
            `)
      );

    if (AdminUser) {
      LogEmbed.setFooter({
        text: `Started by: @${AdminUser.username}; ${LogEmbed.data.footer?.text}`,
      });

      if (TargetUser) {
        LogEmbed.setAuthor({
          name: `@${TargetUser.username}`,
          iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
        });
      }
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
    const BaseData = await this.GetBaseData(ShiftDoc, UserInteract);
    const EndedBreak = ShiftDoc.events.breaks.findLast(() => true) as number[];
    const EndedBreakTime = ReadableDuration(EndedBreak[1] - EndedBreak[0]);
    const AllBreakTime = ReadableDuration(ShiftDoc.durations.on_break);
    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Break Ended")
      .setColor(SharedData.Embeds.Colors.ShiftBreak)
      .setDescription(
        Dedent(`
              **Officer:** <@${ShiftDoc.user}>
              **Shift Started:** ${BaseData.ShiftStartedRT}
              **Break Time:** ${EndedBreakTime}
              **All Break Time:** ${AllBreakTime}
              **Shift Type:** \`${ShiftDoc.type}\`
          `)
      );

    if (AdminUser) {
      LogEmbed.setFooter({
        text: `Ended by: @${AdminUser.username}; ${LogEmbed.data.footer?.text}`,
      });

      if (TargetUser) {
        LogEmbed.setAuthor({
          name: `@${TargetUser.username}`,
          iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
        });
      }
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
    const BaseData = await this.GetBaseData(ShiftDoc, UserInteract);
    const OnDutyTime = ReadableDuration(ShiftDoc.durations.on_duty);
    const OnBreakTime = ShiftDoc.durations.on_duty
      ? ReadableDuration(ShiftDoc.durations.on_break)
      : null;

    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Ended")
      .setColor(SharedData.Embeds.Colors.ShiftEnd)
      .setDescription(
        Dedent(`
              **Officer:** <@${ShiftDoc.user}>
              **Shift Type:** \`${ShiftDoc.type}\`
              **Shift Started:** ${BaseData.ShiftStartedRT}
              **On-Duty Time:** ${OnDutyTime}
              ${OnBreakTime ? `**On-Break Time:** ${OnBreakTime}` : ""}
              
              **Arrests Made:** \`${ShiftDoc.events.arrests}\`
              **Citations Issued:** \`${ShiftDoc.events.citations}\`
          `)
      );

    if (AdminUser) {
      LogEmbed.setFooter({
        text: `Ended by: @${AdminUser.username}; ${LogEmbed.data.footer?.text}`,
      });

      if (TargetUser) {
        LogEmbed.setAuthor({
          name: `@${TargetUser.username}`,
          iconURL: TargetUser.displayAvatarURL(this.AvatarIconOpts),
        });
      }
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
    const BaseData = await this.GetBaseData(ShiftDoc, UserInteract);
    const OnDutyTime = ReadableDuration(ShiftDoc.durations.on_duty);
    const OnBreakTime = ShiftDoc.durations.on_duty
      ? ReadableDuration(ShiftDoc.durations.on_break)
      : null;

    const LogEmbed = BaseData.BaseEmbed.setTitle("Shift Automatically Ended")
      .setColor(SharedData.Embeds.Colors.ShiftEnd)
      .setDescription(
        Dedent(`
              **Officer:** <@${ShiftDoc.user}>
              **Shift Type:** \`${ShiftDoc.type}\`
              **Shift Started:** ${BaseData.ShiftStartedRT}
              **On-Duty Time:** ${OnDutyTime}
              ${OnBreakTime ? `**On-Break Time:** ${OnBreakTime}` : ""}
              **End Reason:** ${EndReason}
              
              **Arrests Made:** \`${ShiftDoc.events.arrests}\`
              **Citations Issued:** \`${ShiftDoc.events.citations}\`
          `)
      );

    return BaseData.LoggingChannel?.send({ embeds: [LogEmbed] });
  }

  /**
   * Logs a shift wipe-all action to the appropriate and specified channel of a guild.
   * @param UserInteract - The received discordjs interaction (button/cmd).
   * @param DeleteResult - The deletion result of mongoose/mongodb.
   * @param ShiftType - Type of shifts that were deleted; defaults to `null` which translates into `*All Types*`.
   * @param TargettedUser - An optional parameter to specify only a targetted user.
   * @returns A promise that resolves to the logging message sent or `undefined` if it wasn't.
   */
  public static async LogShiftsWipe(
    UserInteract: DiscordUserInteract,
    DeleteResult: Mongoose.mongo.DeleteResult & { totalTime: number },
    ShiftType?: string | null,
    TargettedUser?: User
  ) {
    const LoggingChannel = await this.GetLoggingChannel(UserInteract);
    const LogEmbed = new EmbedBuilder()
      .setTimestamp()
      .setColor(Embeds.Colors.ShiftEnd)
      .setTitle(TargettedUser ? "User Shifts Wiped" : "Shifts Wiped")
      .setDescription(
        Dedent(`
        ${TargettedUser ? `**User:** <@${TargettedUser.id}>\n` : ""}
        **Shifts Deleted:** \`${DeleteResult.deletedCount}\`
        **Shifts of Type:** ${ShiftType ? `\`${ShiftType}\`` : "*All Types*"}
        **Total Shifts Time:** ${ReadableDuration(DeleteResult.totalTime ?? 0)}
        **Deleted AdminUser:** <@${UserInteract.user.id}>
      `)
      );

    return LoggingChannel?.send({ embeds: [LogEmbed] });
  }
}
