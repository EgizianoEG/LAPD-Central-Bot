/* eslint-disable sonarjs/no-duplicate-string */
// Dependencies:
// -------------

import {
  Message,
  inlineCode,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ButtonBuilder,
  MessagePayload,
  ActionRowBuilder,
  ButtonInteraction,
  time as FormatTime,
  InteractionReplyOptions,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { Types } from "mongoose";
import { GetErrorId } from "@Utilities/Strings/Random.js";
import { ErrorMessages } from "@Resources/AppMessages.js";
import { Guilds, Shifts } from "@Typings/Utilities/Database.js";
import { Embeds, Emojis } from "@Config/Shared.js";
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

type ShiftDocument = Shifts.HydratedShiftDocument;
export type ShiftMgmtButtonsActionRow = ActionRowBuilder<
  ButtonBuilder & { data: { custom_id: string } }
> & {
  /**
   * Updates the disabled state of the buttons within the shift management action row.
   * @param enabledStates - An object where:
   * - The keys represent the identifiers of the buttons to update (e.g., "start", "break", "end").
   * - The values are booleans indicating the desired disabled state for each button:
   *   - `true` to enable the button.
   *   - `false` to disable the button.
   *   - `undefined` to leave the button's state unchanged.
   *
   * @returns The updated ActionRow instance.
   */
  updateButtons(
    enabledStates: Record<"start" | "break" | "end", boolean | undefined>
  ): ShiftMgmtButtonsActionRow;
};

// ---------------------------------------------------------------------------------------
// Helpers:
// --------
/**
 * Constructs a set of management buttons (start, break, end).
 * @param Interaction - A cached slash command interaction to get guild and user Ids from.
 * @param [ShiftType="default"] - The type of shift to be managed. Defaults to "default", the application's default shift type.
 * @param [ShiftActive] - The current active shift of the user, if any.
 * @notice
 * The pattern for management button IDs is as follows:
 *   `<ShiftAction>:<UserId>:<TargettedShiftType>[:ShiftId]`.
 *   - `<ShiftAction>`: The action to be performed (e.g., `shift-on`, `shift-off`, etc.)
 *   - `<UserId>`: The ID of the user who triggered the action.
 *   - `<TargettedShiftType>`: The type of shift being targeted (e.g., `default`, `break`, etc.)
 *   - `[TargettedShiftId]`: The ID of the shift being targeted, if applicable. Optional as sometimes there is no shift to take action on in the first place.
 *
 * @returns A row of buttons for managing shifts.
 */
export function GetShiftManagementButtons(
  Interaction: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">,
  ShiftType: string | null = "default",
  ShiftActive?: Shifts.HydratedShiftDocument | null
) {
  const ActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ShiftMgmtActions.ShiftOn)
      .setLabel("On Duty")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(ShiftMgmtActions.ShiftBreakToggle)
      .setLabel("Toggle Break")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ShiftMgmtActions.ShiftOff)
      .setLabel("Off Duty")
      .setStyle(ButtonStyle.Danger)
  ) as ShiftMgmtButtonsActionRow;

  ActionRow.updateButtons = function UpdateNavigationButtons(
    ButtonsToEnable: Record<"start" | "break" | "end", boolean | undefined>
  ) {
    const ButtonMap = { start: 0, break: 1, end: 2 };
    for (const [Name, Enabled] of Object.entries(ButtonsToEnable)) {
      this.components[ButtonMap[Name]].setDisabled(!Enabled);
    }
    return this;
  };

  ActionRow.updateButtons({
    start: !ShiftActive || !!ShiftActive.end_timestamp,
    break: !!ShiftActive && !ShiftActive.end_timestamp,
    end: !!ShiftActive && !ShiftActive.end_timestamp && !ShiftActive.hasBreakActive(),
  });

  const ActiveShiftIdSuffix = ShiftActive?.id ? `:${ShiftActive.id}` : "";
  ActionRow.components.forEach((Comp) =>
    Comp.setCustomId(
      `${Comp.data.custom_id}:${Interaction.user.id}:${ShiftType}${ActiveShiftIdSuffix}`
    )
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

  if (CmdShiftType?.toLowerCase() === "default") return true;
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

/**
 * Verifies the usage of a specific shift type.
 * @param CmdInteract - The interaction object for the slash command.
 * @returns A promise that resolves to an object indicating whether the command was handled or not.
 *          If handled, it returns `{ handled: true }`.
 *          If not handled, it returns an object containing:
 *          - `shift_types`: The available shift types from the guild settings.
 *          - `guild_settings`: The guild settings object.
 *          - `target_shift_type`: The determined target shift type.
 *
 * The function performs the following steps:
 * 1. Retrieves the guild settings.
 * 2. Determines the target shift type based on the command interaction options.
 * 3. Checks if the specified shift type exists and if the user is authorized to use it.
 * 4. Returns appropriate responses based on the checks.
 */
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

/**
 * Replies to or edits a reply *safely* to a slash command interaction.
 * @notice The main point of this function is to handle repeated interactions after the webhook token expires.
 *         If the token expires, the function will then attempt to fetch the original command reply (the message)
 *         and edit it with message methods.
 *
 * @param CmdInteract - The slash command interaction object.
 * @param ReplyOpts - The options for the reply or edit.
 * @returns A promise that resolves to the reply or edited message or `null` if nothing were done or an error occurred.
 */
async function CmdInteractSafeReplyOrEditReply(
  CmdInteract: SlashCommandInteraction<"cached">,
  ReplyOpts: MessagePayload | InteractionReplyOptions
): Promise<Message<true>> {
  try {
    let CmdMessage: Message<true>;
    if (CmdInteract.deferred || CmdInteract.replied) {
      CmdMessage = await CmdInteract.editReply(ReplyOpts as MessagePayload);
    } else {
      CmdMessage = await CmdInteract.reply({
        ...(ReplyOpts as InteractionReplyOptions),
        withResponse: true,
      }).then((Resp) => Resp.resource!.message! as Message<true>);
    }
    return CmdMessage;
  } catch (Err) {
    const CmdReplyMsg = await CmdInteract.fetchReply().catch(() => null);
    if (!CmdReplyMsg?.editable) throw Err;
    return CmdReplyMsg.edit(ReplyOpts as MessagePayload);
  }
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
  const MgmtComps = GetShiftManagementButtons(CmdInteract, MgmtShiftType);
  const PromptEmbed = MgmtPromptEmbed.setColor(
    MgmtPromptEmbed.data.color || Embeds.Colors.ShiftNatural
  );

  const PromptMessage = await CmdInteractSafeReplyOrEditReply(CmdInteract, {
    embeds: [PromptEmbed],
    components: [MgmtComps],
  });

  if (!PromptMessage) return;
  try {
    const RecInteract = await PromptMessage.awaitMessageComponent({
      filter: (Interact) => Interact.user.id === CmdInteract.user.id,
      componentType: ComponentType.Button,
      time: 15 * 60 * 1000,
    });

    const BtnCustomId = RecInteract.customId;
    await RecInteract.deferUpdate();

    if (BtnCustomId.startsWith(ShiftMgmtActions.ShiftOn)) {
      await HandleShiftStartConfirmation(CmdInteract, RecInteract, MgmtShiftType);
    }
  } catch (Err: any) {
    if (Err.message.match(/reason: \w+Delete/)) return;
    if (Err.message.match(/reason: (?:time|idle)/)) {
      return PromptMessage.edit({
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
  const BreakEpochs = ShiftActive.events.breaks.findLast(([, end]) => end === null);
  const MgmtComps = GetShiftManagementButtons(CmdInteract, ShiftActive.type, ShiftActive);
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

  const PromptMessage = await CmdInteractSafeReplyOrEditReply(CmdInteract, {
    components: [MgmtComps],
    embeds: [PromptEmbed],
  });

  if (!PromptMessage) return;
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
    if (Err.message.match(/reason: (?:time|idle)/)) {
      return PromptMessage.edit({
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
  const PromptEmbed = MgmtPromptEmbed.setColor(Embeds.Colors.ShiftOn);
  const MgmtButtonComponents = GetShiftManagementButtons(
    CmdInteract,
    ShiftActive.type,
    ShiftActive
  );

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

  const PromptMessage = await CmdInteractSafeReplyOrEditReply(CmdInteract, {
    components: [MgmtButtonComponents.updateButtons({ start: false, break: true, end: true })],
    embeds: [PromptEmbed],
  });

  if (!PromptMessage) return;
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
    if (Err.message.match(/reason: (?:time|idle)/)) {
      return PromptMessage.edit({
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
  const CmdShiftType = CmdInteract.options.getString("type", false);
  const ShiftActive = await GetShiftActive({
    ShiftType: CmdShiftType ? TargetShiftType : undefined,
    Interaction: CmdInteract,
    UserOnly: true,
  });

  const MemberShiftsData = await GetMainShiftsData(
    {
      user: CmdInteract.user.id,
      guild: CmdInteract.guildId,
      type: ShiftActive ? ShiftActive.type : TargetShiftType,
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
    .setTitle(ShiftActive ? `Shift Management: \`${ShiftActive.type}\` Type` : MgmtEmbedTitle);

  if (RecentAction) {
    if (RecentAction === RecentShiftAction.End) {
      BasePromptEmbed.setColor(Embeds.Colors.ShiftOff);
      BasePromptEmbed.setTitle(RecentAction);
      BasePromptEmbed.setFooter({ text: `Shift Type: ${TargetShiftType}` });

      const MostRecentFinishedShift = await ShiftModel.findOne({
        user: CmdInteract.user.id,
        guild: CmdInteract.guildId,
        end_timestamp: { $ne: null },
      }).sort({ end_timestamp: -1 });

      if (MostRecentFinishedShift) {
        const BreakTimeText =
          MostRecentFinishedShift.durations.on_break > 500
            ? `**Break Time:** ${MostRecentFinishedShift.on_break_time}`
            : "";

        BasePromptEmbed.addFields(
          {
            inline: true,
            name: "Shift Overview",
            value: Dedent(`
              >>> **Status:** (${Emojis.Offline}) Off-Duty
              **Shift Time:** ${MostRecentFinishedShift.on_duty_time}
              ${BreakTimeText}
            `),
          },
          {
            inline: true,
            name: "Shift Activity",
            value: Dedent(`
              >>> **Arrests Made:** \`${MostRecentFinishedShift.events.arrests}\`
              **Citations Issued:** \`${MostRecentFinishedShift.events.citations}\`
              **Incidents Reported:** \`${MostRecentFinishedShift.events.incidents}\`
            `),
          },
          {
            inline: false,
            name: "All Statistics",
            value: MgmtPromptMainDesc,
          }
        );
      }
    } else if (RecentAction === RecentShiftAction.BreakEnd && ShiftActive?.hasBreaks()) {
      const EndedBreak = ShiftActive.events.breaks.findLast((v) => v[0] && v[1])!;
      BasePromptEmbed.setFooter({ text: `Shift Type: ${TargetShiftType}` });
      BasePromptEmbed.setTitle(RecentAction);
      BasePromptEmbed.setFields({
        inline: true,
        name: "Current Shift",
        value: Dedent(`
          >>> **Status:** (${Emojis.Online}) On Duty
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
        inline: true,
        name: "Current Shift",
        value: Dedent(`
          >>> **Status:** (${Emojis.Idle}) On Break
          **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
          **Break Started:** ${FormatTime(Math.round(StartedBreak[0] / 1000), "R")}
          **On-Duty Time:** ${ShiftActive.on_duty_time}
          ${ShiftActive.events.breaks.length > 1 ? `**Total Break Time:** ${ShiftActive.on_break_time}` : ""}
        `),
      });
    }
  } else {
    BasePromptEmbed.setFields({
      inline: true,
      name: "All Statistics",
      value: MgmtPromptMainDesc,
    });
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
  callback: Callback,
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
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
