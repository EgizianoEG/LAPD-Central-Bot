/* eslint-disable sonarjs/no-duplicate-string */
// ---------------------------------------------------------------------------------------
// Dependencies:
// -------------

import {
  inlineCode,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonInteraction,
  time as FormatTime,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { Types } from "mongoose";
import { ErrorMessages } from "@Resources/AppMessages.js";
import { Guilds, Shifts } from "@Typings/Utilities/Database.js";
import { Embeds, Emojis } from "@Config/Shared.js";
import { NavButtonsActionRow } from "@Utilities/Other/GetNavButtons.js";
import { GetErrorId, RandomString } from "@Utilities/Strings/Random.js";
import { ErrorEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleRoleAssignment from "@Utilities/Other/HandleShiftRoleAssignment.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";
import ShiftModel from "@Models/Shift.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import DHumanize from "humanize-duration";
import AppError from "@Utilities/Classes/AppError.js";
import Dedent from "dedent";

const FileLabel = "Commands:Miscellaneous:Duty:Manage";
const HumanizeDuration = DHumanize.humanizer({
  conjunction: " and ",
  largest: 3,
  round: true,
});

type ShiftDocument = Shifts.HydratedShiftDocument;
enum RecentShiftAction {
  End = "Shift Ended",
  Start = "Shift Started",
  BreakEnd = "Shift Break Ended",
  BreakStart = "Shift Break Started",
}

enum ShiftMgmtActions {
  ShiftOn = "dm-start",
  ShiftOff = "dm-end",
  ShiftBreakToggle = "dm-break",
}

// ---------------------------------------------------------------------------------------
// Helpers:
// --------
/**
 * Constructs a set of management buttons (start, break, end).
 * @param Interaction - A cached interaction to get guild and user ids from.
 * @param ShiftActive - The current active shift of the user.
 * @notice Each button has a custom_id that is composed of the button name (start, break, end) and the user id separated by a colon.
 * @returns
 */
function GetManagementButtons(
  Interaction: SlashCommandInteraction<"cached">,
  ShiftActive?: Shifts.HydratedShiftDocument | null
) {
  const ActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ShiftMgmtActions.ShiftOn)
      .setLabel("On Duty")
      .setDisabled(false)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(ShiftMgmtActions.ShiftBreakToggle)
      .setLabel("Toggle Break")
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ShiftMgmtActions.ShiftOff)
      .setLabel("Off Duty")
      .setDisabled(true)
      .setStyle(ButtonStyle.Danger)
  ) as NavButtonsActionRow;

  ActionRow.updateButtons = function UpdateNavigationButtons(ButtonsToEnable: {
    [key: string]: boolean | undefined;
  }) {
    const ButtonMap = { start: 0, break: 1, end: 2 };
    for (const [Name, Enabled] of Object.entries(ButtonsToEnable)) {
      this.components[ButtonMap[Name]].setDisabled(!Enabled);
    }
    return this;
  };

  // Update the button states.
  ActionRow.updateButtons({
    start: !ShiftActive?.end_timestamp,
    break: !ShiftActive?.end_timestamp && ShiftActive?.events.breaks.some(([, end]) => !end),
    end: !ShiftActive?.end_timestamp && ShiftActive?.events.breaks.some(([, end]) => !!end),
  });

  // Set custom Ids for each component based on the user and guild Ids.
  const UniqueStr = RandomString(4);
  ActionRow.components.forEach((Comp) =>
    Comp.setCustomId(`${Comp.data.custom_id}:${Interaction.user.id}:${UniqueStr}`)
  );

  return ActionRow;
}

/**
 * Handles the validation of shift type restrictions and checks whether the user has permission to use a specific shift type.
 * @param Interaction - The received command interaction.
 * @param GuildShiftTypes - The created shift types of the interaction's guild.
 * @param CmdShiftType - The user requested/received shift type.
 * @returns A boolean value. `true` if the user has permission to use the shift type, `false` otherwise.
 */
async function CheckShiftTypeRestrictions(
  Interaction: SlashCommandInteraction<"cached">,
  GuildShiftTypes: Types.DocumentArray<Guilds.ShiftType>,
  CmdShiftType?: string | null
) {
  const GuildDefaultType = GuildShiftTypes.find((ShiftType) => ShiftType.is_default);
  const DesiredShiftType = GuildShiftTypes.find((ShiftType) => ShiftType.name === CmdShiftType);

  if (CmdShiftType === "Default") return true;
  if (!CmdShiftType && !GuildDefaultType) return true;

  // Users with management permissions can use any shift type.
  const UserHasMgmtPerms = await UserHasPerms(Interaction, {
    management: { guild: true, app: true, $or: true },
  });

  if (UserHasMgmtPerms) return true;
  if (CmdShiftType && DesiredShiftType) {
    return Interaction.member.roles.cache.hasAny(...DesiredShiftType.access_roles);
  } else if (GuildDefaultType) {
    return Interaction.member.roles.cache.hasAny(...GuildDefaultType.access_roles);
  }

  return false;
}

async function HandleCommandUsageVerification(
  CmdInteract: SlashCommandInteraction<"cached">
): Promise<
  | { handled: true }
  | {
      handled: false;
      shift_types: NonNullable<
        Awaited<ReturnType<typeof GetGuildSettings>>
      >["shift_management"]["shift_types"];
      guild_settings: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>;
      target_shift_type: string;
    }
> {
  const GuildSettings = await GetGuildSettings(CmdInteract.guildId);
  if (!GuildSettings) {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(CmdInteract, true)
      .then(() => {
        return {
          handled: true,
        };
      });
  }

  const ShiftTypes = GuildSettings.shift_management.shift_types;
  const CmdShiftType = CmdInteract.options.getString("type")?.trim();
  const CmdShiftTypeMDef = CmdShiftType?.match(/^Default$/i);
  const GuildDefaultST = ShiftTypes.findIndex((ShiftType) => ShiftType.is_default);
  const CustomSTIndex = ShiftTypes.findIndex((ShiftType) => ShiftType.name === CmdShiftType);
  let TargetShiftType = "";

  if (CmdShiftTypeMDef) {
    TargetShiftType = "Default";
  } else if (CustomSTIndex !== -1) {
    TargetShiftType = ShiftTypes[CustomSTIndex].name;
  } else if (!CmdShiftType) {
    TargetShiftType = ShiftTypes[GuildDefaultST]?.name || "Default";
  }

  // Early return if the input shift type inputted is not found as a custom shift type;
  if (CmdShiftType && !CmdShiftTypeMDef && CustomSTIndex === -1) {
    return new ErrorEmbed()
      .useErrTemplate("NonexistentShiftTypeUsage")
      .replyToInteract(CmdInteract, true)
      .then(() => {
        return {
          handled: true,
        };
      });
  }

  const IsUsageAllowed = await CheckShiftTypeRestrictions(CmdInteract, ShiftTypes, TargetShiftType);

  // Or if the user is not allowed to use a specific shift type.
  if (!IsUsageAllowed) {
    return new UnauthorizedEmbed()
      .useErrTemplate("UnauthorizedShiftTypeUsage")
      .replyToInteract(CmdInteract, true)
      .then(() => {
        return {
          handled: true,
        };
      });
  }

  return {
    handled: false,
    shift_types: ShiftTypes,
    guild_settings: GuildSettings,
    target_shift_type: TargetShiftType,
  };
}

// ---------------------------------------------------------------------------------------
// Action Handlers:
// ----------------
async function HandleShiftStartConfirmation(
  CmdInteract: SlashCommandInteraction<"cached">,
  BtnInteract: ButtonInteraction<"cached">,
  TargetShiftType: string
) {
  if (!BtnInteract.deferred) await BtnInteract.deferUpdate();
  if (!BtnInteract.customId.startsWith(ShiftMgmtActions.ShiftOn)) return;
  try {
    const StartedShift = await ShiftModel.startNewShift({
      type: TargetShiftType,
      user: BtnInteract.user.id,
      guild: BtnInteract.guildId,
      start_timestamp: BtnInteract.createdAt,
    });

    await Promise.all([
      Callback(CmdInteract),
      ShiftActionLogger.LogShiftStart(StartedShift, BtnInteract),
      HandleRoleAssignment("on-duty", BtnInteract.client, BtnInteract.guild, BtnInteract.user.id),
    ]);
  } catch (Err: any) {
    const ErrorId = GetErrorId();
    if (Err instanceof AppError && Err.is_showable) {
      if (Err.title === ErrorMessages.ShiftAlreadyActive.Title) {
        return Promise.all([
          Callback(CmdInteract),
          new ErrorEmbed().useErrClass(Err).replyToInteract(BtnInteract, true, true, "followUp"),
        ]);
      }

      new ErrorEmbed()
        .useErrClass(Err)
        .setErrorId(ErrorId)
        .replyToInteract(BtnInteract, true, true, "followUp");
    }

    AppLogger.error({
      message: "An error occurred while creating a new shift record;",
      label: "Commands:Miscellaneous:Duty:Manage",
      user_id: BtnInteract.user.id,
      guild_id: BtnInteract.guildId,
      error_id: ErrorId,
      stack: Err.stack,
    });
  }
}

async function HandleNonActiveShift(
  CmdInteract: SlashCommandInteraction<"cached">,
  MgmtPromptEmbed: EmbedBuilder,
  MgmtShiftType: string
) {
  const ReplyMethod = CmdInteract.deferred || CmdInteract.replied ? "editReply" : "reply";
  const PromptEmbed = EmbedBuilder.from(MgmtPromptEmbed).setColor(
    MgmtPromptEmbed.data.color || Embeds.Colors.ShiftNatural
  );

  const MgmtComps = GetManagementButtons(CmdInteract).updateButtons({
    start: true,
    break: false,
    end: false,
  });

  const PromptMessage = await CmdInteract[ReplyMethod]({
    components: [MgmtComps],
    embeds: [PromptEmbed],
  });

  try {
    const RecInteract = await PromptMessage.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (Interact) => Interact.user.id === CmdInteract.user.id,
      time: 15 * 60 * 1000,
    });

    const BtnCustomId = RecInteract.customId;
    await RecInteract.deferUpdate();

    if (BtnCustomId.startsWith(ShiftMgmtActions.ShiftOn)) {
      await HandleShiftStartConfirmation(CmdInteract, RecInteract, MgmtShiftType);
    }
  } catch (Err: any) {
    if (Err.message.match(/reason: \w+Delete/)) return;
    if (Err.message.match(/reason: time|idle/)) {
      return CmdInteract.editReply({
        components: [MgmtComps.updateButtons({ start: false, break: false, end: false })],
      }).catch(() => null);
    }

    AppLogger.error({
      message:
        "An unhandled error occurred while waiting for a duty management button interaction.",
      label: FileLabel,
      stack: Err.stack,
    });
  }
}

async function HandleShiftBreakStart(
  CmdInteract: SlashCommandInteraction<"cached">,
  ShiftActive: Shifts.HydratedShiftDocument,
  ButtonInteract: ButtonInteraction<"cached">
) {
  const UpdatedShift = await ShiftActive.breakStart(ButtonInteract.createdTimestamp).catch(
    (Err: any) => {
      if (Err instanceof AppError && Err.is_showable) {
        return Err;
      }
      throw Err;
    }
  );

  if (UpdatedShift instanceof AppError) {
    return Promise.all([
      Callback(CmdInteract, RecentShiftAction.BreakStart),
      new ErrorEmbed()
        .useErrClass(UpdatedShift)
        .replyToInteract(ButtonInteract, true, false, "followUp"),
    ]);
  }

  return Promise.all([
    Callback(CmdInteract, RecentShiftAction.BreakStart),
    ShiftActionLogger.LogShiftBreakStart(UpdatedShift, ButtonInteract),
    HandleRoleAssignment(
      "on-break",
      ButtonInteract.client,
      ButtonInteract.guild,
      ButtonInteract.user.id
    ),
  ]);
}

async function HandleOnBreakShift(
  CmdInteract: SlashCommandInteraction<"cached">,
  ShiftActive: Shifts.HydratedShiftDocument,
  BaseEmbedTitle: string
) {
  const ReplyMethod = CmdInteract.deferred || CmdInteract.replied ? "editReply" : "reply";
  const BreakEpochs = ShiftActive.events.breaks.findLast(([, end]) => end === null);
  const MgmtComps = GetManagementButtons(CmdInteract);
  const FieldDescription = Dedent(`
    >>> **Status:** (${Emojis.Idle}) On Break
    **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
    **Break Started:** ${FormatTime(Math.round(BreakEpochs![0] / 1000), "R")}
    **On-Duty Time:** ${ShiftActive.on_duty_time}
  `);

  const PromptEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.ShiftBreak)
    .setTitle(BaseEmbedTitle)
    .setFields({ name: "Current Shift", value: FieldDescription });

  const PromptMessage = await CmdInteract[ReplyMethod]({
    components: [MgmtComps.updateButtons({ start: false, break: true, end: false })],
    embeds: [PromptEmbed],
  });

  try {
    const RecInteract = await PromptMessage.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (Interact) => Interact.user.id === CmdInteract.user.id,
      time: 15 * 60 * 1000,
    });

    const BtnCustomId = RecInteract.customId;
    await RecInteract.deferUpdate();

    if (BtnCustomId.startsWith(ShiftMgmtActions.ShiftBreakToggle)) {
      const UpdatedShift = await ShiftActive.breakEnd(RecInteract.createdTimestamp);
      return Promise.allSettled([
        Callback(CmdInteract, RecentShiftAction.BreakEnd),
        ShiftActionLogger.LogShiftBreakEnd(UpdatedShift as any, RecInteract),
        HandleRoleAssignment("on-duty", RecInteract.client, RecInteract.guild, RecInteract.user.id),
      ]);
    }
  } catch (Err: any) {
    if (Err.message.match(/reason: \w+Delete/)) return;
    if (Err.message.match(/reason: time|idle/)) {
      return CmdInteract.editReply({
        components: [MgmtComps.updateButtons({ start: false, break: false, end: false })],
      }).catch(() => null);
    }

    if (Err instanceof AppError && Err.is_showable) {
      return Promise.allSettled([
        new ErrorEmbed().useErrClass(Err).replyToInteract(CmdInteract, true, true, "followUp"),
        Callback(CmdInteract),
      ]);
    }

    AppLogger.error({
      message:
        "An unhandled error occurred while waiting for a duty management button interaction.",
      label: FileLabel,
      stack: Err.stack,
    });
  }
}

async function HandleShiftEnd(
  CmdInteract: SlashCommandInteraction<"cached">,
  ShiftActive: Shifts.HydratedShiftDocument,
  ButtonInteract: ButtonInteraction<"cached">
) {
  const UpdatedShift = await ShiftActive.end(ButtonInteract.createdTimestamp).catch((Err: any) => {
    if (Err instanceof AppError && Err.is_showable) {
      return Err;
    }
    throw Err;
  });

  if (UpdatedShift instanceof AppError) {
    const ShiftExists = await ShiftModel.exists({ _id: ShiftActive._id });
    return Promise.allSettled([
      Callback(CmdInteract, ShiftExists ? RecentShiftAction.End : undefined),
      new ErrorEmbed()
        .useErrClass(UpdatedShift)
        .replyToInteract(ButtonInteract, true, true, "followUp"),
    ]);
  }

  return Promise.allSettled([
    Callback(CmdInteract, RecentShiftAction.End),
    ShiftActionLogger.LogShiftEnd(UpdatedShift, ButtonInteract),
    HandleRoleAssignment(
      "off-duty",
      ButtonInteract.client,
      ButtonInteract.guild,
      ButtonInteract.user.id
    ),
  ]);
}

async function HandleActiveShift(
  CmdInteract: SlashCommandInteraction<"cached">,
  ShiftActive: ShiftDocument,
  MgmtPromptEmbed: EmbedBuilder
) {
  const MgmtButtonComponents = GetManagementButtons(CmdInteract, ShiftActive);
  const PromptEmbed = EmbedBuilder.from(MgmtPromptEmbed).setColor(Embeds.Colors.ShiftOn);

  if (!PromptEmbed.data.fields?.find((Field) => Field.name === "Current Shift")) {
    if (ShiftActive.durations.on_break > 500) {
      PromptEmbed.addFields({
        name: "Current Shift",
        value: Dedent(`
          >>> **Status:** (${Emojis.Online}) On Duty
          **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
          **Break Count:** ${inlineCode(ShiftActive.events.breaks.length.toString())}
          **Total Break Time:** ${HumanizeDuration(ShiftActive.durations.on_break)}
        `),
      });
    } else {
      PromptEmbed.addFields({
        name: "Current Shift",
        value: Dedent(`
          >>> **Status:** (${Emojis.Online}) On Duty
          **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
        `),
      });
    }
  }

  const ReplyMethod = CmdInteract.deferred || CmdInteract.replied ? "editReply" : "reply";
  const PromptMessage = await CmdInteract[ReplyMethod]({
    fetchReply: true,
    components: [MgmtButtonComponents.updateButtons({ start: false, break: true, end: true })],
    embeds: [PromptEmbed],
  });

  try {
    const RecInteract = await PromptMessage.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (Interact) => Interact.user.id === CmdInteract.user.id,
      time: 15 * 60 * 1000,
    });

    const BtnCustomId = RecInteract.customId;
    await RecInteract.deferUpdate();

    if (BtnCustomId.startsWith(ShiftMgmtActions.ShiftBreakToggle)) {
      await HandleShiftBreakStart(CmdInteract, ShiftActive, RecInteract);
    } else if (BtnCustomId.startsWith(ShiftMgmtActions.ShiftOff)) {
      await HandleShiftEnd(CmdInteract, ShiftActive, RecInteract);
    }
  } catch (Err: any) {
    if (Err.message.match(/reason: \w+Delete/)) return;
    if (Err.message.match(/reason: time|idle/)) {
      return CmdInteract.editReply({
        components: [
          MgmtButtonComponents.updateButtons({ start: false, break: false, end: false }),
        ],
      }).catch(() => null);
    }

    AppLogger.error({
      message:
        "An unhandled error occurred while handling duty management button interactions for active shift.",
      label: FileLabel,
      stack: Err.stack,
    });
  }
}

// ---------------------------------------------------------------------------------------
// Initial Handling:
// -----------------
async function Callback(
  CmdInteract: SlashCommandInteraction<"cached">,
  RecentAction?: RecentShiftAction
) {
  if (!CmdInteract.deferred && !CmdInteract.replied) await CmdInteract.deferReply();
  const VerificationDetails = await HandleCommandUsageVerification(CmdInteract);
  if (VerificationDetails.handled === true) return;

  const TargetShiftType = VerificationDetails.target_shift_type;
  const ShiftActive = await GetShiftActive({
    ShiftType: TargetShiftType,
    Interaction: CmdInteract,
    UserOnly: true,
  });

  const MemberShiftsData = await GetMainShiftsData(
    {
      user: CmdInteract.user.id,
      guild: CmdInteract.guildId,
      type: TargetShiftType,
    },
    !!ShiftActive
  );

  const MgmtEmbedTitle = `Shift Management: \`${TargetShiftType}\` Type`;
  const MgmtPromptMainDesc = Dedent(`
    >>> **Shift Count:** \`${MemberShiftsData.shift_count}\`
    **Total On-Duty Time:** ${MemberShiftsData.total_onduty}
    **Average On-Duty Time:** ${MemberShiftsData.avg_onduty}
  `);

  const BasePromptEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.ShiftNatural)
    .setTitle(ShiftActive ? `Shift Management: \`${ShiftActive.type}\` Type` : MgmtEmbedTitle)
    .setFields({
      name: "All Statistics",
      value: MgmtPromptMainDesc,
    });

  if (RecentAction) {
    if (RecentAction === RecentShiftAction.End) {
      BasePromptEmbed.setColor(Embeds.Colors.ShiftOff);
      BasePromptEmbed.setTitle(RecentAction);
      BasePromptEmbed.setFooter({ text: `Shift Type: ${TargetShiftType}` });

      const LatestEndedShift = await ShiftModel.findOne({
        user: CmdInteract.user.id,
        guild: CmdInteract.guildId,
        end_timestamp: { $ne: null },
      }).sort({ end_timestamp: -1 });

      if (LatestEndedShift) {
        const BreakTimeText =
          LatestEndedShift.durations.on_break > 500
            ? `**Break Time:** ${LatestEndedShift.on_break_time}`
            : "";

        BasePromptEmbed.addFields(
          {
            inline: true,
            name: "Shift Overview",
            value: Dedent(`
              >>> **Status:** (${Emojis.Offline}) Off-Duty
              **Shift Time:** ${LatestEndedShift.on_duty_time}
              ${BreakTimeText}
            `),
          },
          {
            inline: true,
            name: "Shift Activity",
            value: Dedent(`
              >>> **Arrests Made:** \`${LatestEndedShift.events.arrests}\`
              **Citations Issued:** \`${LatestEndedShift.events.citations}\`
              **Incidents Reported:** \`${LatestEndedShift.events.incidents}\`
            `),
          }
        );
      }
    } else if (RecentAction === RecentShiftAction.BreakEnd && ShiftActive?.hasBreaks()) {
      const EndedBreak = ShiftActive.events.breaks.findLast((v) => v[0] && v[1])!;
      BasePromptEmbed.setFooter({ text: `Shift Type: ${TargetShiftType}` });
      BasePromptEmbed.setTitle(RecentAction);
      BasePromptEmbed.setFields({
        name: "Current Shift",
        value: Dedent(`
          **Status:** (${Emojis.Online}) On Duty
          **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
          **Ended Break Time:** ${EndedBreak[1] ? HumanizeDuration(EndedBreak[1] - EndedBreak[0]) : "N/A"}
          **Total Break Time:** ${ShiftActive.on_break_time}
          ${ShiftActive.events.breaks.length > 1 ? `**Breaks Taken:** ${ShiftActive.events.breaks.length}` : ""}
        `),
      });
    } else if (RecentAction === RecentShiftAction.BreakStart && ShiftActive?.hasBreakActive()) {
      const StartedBreak = ShiftActive.events.breaks.findLast((v) => !v[1])!;
      BasePromptEmbed.setFooter({ text: `Shift Type: ${TargetShiftType}` });
      BasePromptEmbed.setTitle(RecentAction);
      BasePromptEmbed.setFields({
        name: "Current Shift",
        value: Dedent(`
          **Status:** (${Emojis.Idle}) On Break
          **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
          **Break Started:** ${FormatTime(Math.round(StartedBreak[0] / 1000), "R")}
          **On-Duty Time:** ${ShiftActive.on_duty_time}**
          ${ShiftActive.events.breaks.length > 1 ? `**Total Break Time:** ${ShiftActive.on_break_time}` : ""}
        `),
      });
    }
  }

  if (!ShiftActive) {
    return HandleNonActiveShift(CmdInteract, BasePromptEmbed, TargetShiftType);
  } else if (ShiftActive.hasBreakActive()) {
    return HandleOnBreakShift(CmdInteract, ShiftActive, BasePromptEmbed.data.title!);
  }

  return HandleActiveShift(CmdInteract, ShiftActive, BasePromptEmbed);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("manage")
    .setDescription("Manage and control your own duty shift.")
    .addStringOption((Option) =>
      Option.setName("type")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
        .setDescription(
          "The type of duty shift to be managed; defaults to this server's default shift type."
        )
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
