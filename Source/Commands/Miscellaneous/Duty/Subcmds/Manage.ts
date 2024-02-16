/* eslint-disable sonarjs/no-duplicate-string */
// ---------------------------------------------------------------------------------------
// Dependencies:
// -------------

import {
  Colors,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonInteraction,
  time as FormatTime,
  InteractionResponse,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { Types } from "mongoose";
import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { Embeds, Emojis } from "@Config/Shared.js";
import { ActiveShiftsCache } from "@Utilities/Other/Cache.js";
import { NavButtonsActionRow } from "@Utilities/Other/GetNavButtons.js";
import { ErrorEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import GetUserPresence, { UserPresence } from "@Utilities/Roblox/GetUserPresence.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import HandleRoleAssignment from "@Utilities/Other/HandleShiftRoleAssignment.js";
import GetLinkedRobloxUser from "@Utilities/Database/IsUserLoggedIn.js";
import GetMainShiftsData from "@Utilities/Database/GetShiftsData.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";
import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";
import ShiftModel from "@Models/Shift.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import DHumanize from "humanize-duration";
import Dedent from "dedent";

const HumanizeDuration = DHumanize.humanizer({
  conjunction: " and ",
  largest: 3,
  round: true,
});

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Constructs a set of management buttons (start, break, end).
 * @param Interaction - A cached interaction to get guild and user ids from.
 * @param ShiftActive - The current active shift of the user.
 * @notice Each button has a custom_id that is composed of the button name (start, break, end), the user id, and guild id separated by a colon.
 * @returns
 */
function GetManagementButtons(
  Interaction: SlashCommandInteraction<"cached">,
  ShiftActive: ExtraTypings.HydratedShiftDocument | null
) {
  const ActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dm-start")
      .setLabel("Start")
      .setDisabled(false)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("dm-break")
      .setLabel("Break")
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dm-end")
      .setLabel("End")
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary)
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
  ActionRow.components.forEach((Comp) =>
    Comp.setCustomId(`${Comp.data.custom_id}:${Interaction.user.id}:${Interaction.guildId}`)
  );

  return ActionRow;
}

/**
 * Handles the validation of shift type restrictions and checks whether the user has permission to use a specific shift type.
 * @param Interaction - The received command interaction.
 * @param GuildShiftTypes - The created shift types of the interaction's guild.
 * @param CmdShiftType - The user requested/received shift type.
 * @returns A boolean value.
 */
async function HandleShiftTypeRestrictions(
  Interaction: SlashCommandInteraction<"cached">,
  GuildShiftTypes: Types.DocumentArray<ExtraTypings.GuildShiftType>,
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

/**
 * Returns an object with options for awaiting a button interaction within a specific time frame.
 * @param OrgInteract - Represents the original slash command interaction received first.
 * @returns an object with the following properties:
 * - `filter`: a function that takes a `ButtonInteract` parameter and calls the`HandleCollectorFiltering` function.
 * - `componentType`: a value of `ComponentType.Button`.
 * - `time`: the amount of time in milliseconds to wait for a button interaction. `5` minutes.
 */
function AwaitMsgCompOptions(OrgInteract: SlashCommandInteraction<"cached">) {
  return {
    filter: (ButtonInteract: ButtonInteraction<"cached">) =>
      HandleCollectorFiltering(OrgInteract, ButtonInteract),
    componentType: ComponentType.Button as ComponentType.Button,
    time: 5 * 60_000,
  };
}

async function HandleNonActiveShift(
  BaseEmbedTitle: string,
  ShiftDataInfo: string,
  Interaction: SlashCommandInteraction<"cached">,
  ButtonsActionRow: NavButtonsActionRow,
  MngShiftType: string
) {
  const ReplyMethod = Interaction.deferred ? "editReply" : "reply";
  const RespEmbed = new EmbedBuilder()
    .setColor(Colors.DarkBlue)
    .setTitle(BaseEmbedTitle)
    .setFields([{ name: "All Time Info:", value: ShiftDataInfo }]);

  const Response = await Interaction[ReplyMethod]({
    components: [ButtonsActionRow],
    embeds: [RespEmbed],
  });

  const ComponentCollector = Response.createMessageComponentCollector(
    AwaitMsgCompOptions(Interaction)
  );

  ComponentCollector.on("collect", async (ButtonInteract) => {
    const LinkedRobloxUser = await GetLinkedRobloxUser(ButtonInteract);
    const UserPresence = (await GetUserPresence(LinkedRobloxUser)) as UserPresence;
    const ShiftActive = await GetShiftActive({ Interaction, UserOnly: true });

    if (UserPresence.userPresenceType !== 2) {
      await new ErrorEmbed()
        .useErrTemplate("SMRobloxUserNotInGame")
        .replyToInteract(ButtonInteract, true);
    } else if (ShiftActive) {
      await new ErrorEmbed()
        .useErrTemplate("ShiftAlreadyActive", ShiftActive.type)
        .replyToInteract(ButtonInteract, true);
    } else {
      ComponentCollector.stop("confirm-start");
    }
  });

  ComponentCollector.once("end", async (Collected, EndReason) => {
    ComponentCollector.removeAllListeners();
    const ButtonInteract = Collected.last();

    if (EndReason.match(/\w+Delete/)) return;
    try {
      if (EndReason === "time") {
        await Response.edit({
          components: [ButtonsActionRow.updateButtons({ start: false, break: false, end: false })],
        });
        return;
      }

      const StartedShift = await ShiftModel.create({
        type: MngShiftType,
        user: Interaction.user.id,
        guild: Interaction.guildId,
        start_timestamp: ButtonInteract!.createdTimestamp,
      });

      ActiveShiftsCache.set(StartedShift._id, Interaction);
      await Promise.all([
        ShiftActionLogger.LogShiftStart(StartedShift, Interaction),
        Response.edit({
          components: [],
          embeds: [
            new EmbedBuilder()
              .setColor(Embeds.Colors.ShiftStart)
              .setTitle("Shift Started")
              .setDescription(
                `Shift started with the \`${MngShiftType}\` shift type.\n` +
                  `Started at: <t:${Math.round(StartedShift.start_timestamp.valueOf() / 1000)}:f>`
              ),
          ],
        }),
        HandleRoleAssignment(
          "on-duty",
          Interaction.client,
          Interaction.guildId,
          Interaction.user.id
        ),
      ]);
    } catch (Err: any) {
      AppLogger.error({
        message: "An error occurred while creating a new shift;",
        label: "Commands:Miscellaneous:Duty:Manage",
        user_id: Interaction.user.id,
        guild_id: Interaction.guildId,
        stack: Err.stack,
      });

      await new ErrorEmbed()
        .useErrTemplate("AppError")
        .replyToInteract(ButtonInteract ?? Interaction);
    }
  });
}

async function HandleShiftBreakStart(
  ShiftActive: ExtraTypings.HydratedShiftDocument,
  ButtonInteract: ButtonInteraction<"cached">,
  TotalBreakTime: string | null,
  Reply: InteractionResponse<true>
) {
  const UpdatedShift = await ShiftActive.breakStart(ButtonInteract.createdTimestamp);
  const BreakStarted = FormatTime(Math.round(ButtonInteract.createdTimestamp / 1000), "R");
  const Embed = new EmbedBuilder()
    .setColor(Embeds.Colors.ShiftBreak)
    .setTitle("Break Started")
    .setFields({
      name: "Current Shift:",
      value: Dedent(`
            **Status:** ${Emojis.Idle} On Break
            **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
            **Break Started:** ${BreakStarted}
            ${TotalBreakTime || ""}
            `),
    });

  return Promise.all([
    ShiftActionLogger.LogShiftBreakStart(UpdatedShift, ButtonInteract),
    Reply.edit({ components: [], embeds: [Embed] }),
    HandleRoleAssignment(
      "on-break",
      ButtonInteract.client,
      ButtonInteract.guildId,
      ButtonInteract.user.id
    ),
  ]);
}

async function HandleOnBreakShift(
  ShiftActive: ExtraTypings.HydratedShiftDocument,
  BaseEmbedTitle: string,
  Interaction: SlashCommandInteraction<"cached">,
  ButtonsActionRow: NavButtonsActionRow,
  CollectorExceptionHandler: (Err: Error, Prompt: InteractionResponse<true>) => Promise<void>
) {
  const ReplyMethod = Interaction.deferred ? "editReply" : "reply";
  const BreakEpochs = ShiftActive.events.breaks.findLast(([, end]) => end === null);
  const FieldDescription = Dedent(`
      **Status:** ${Emojis.Idle} On Break
      **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
      **Break Started:** ${FormatTime(Math.round(BreakEpochs![0] / 1000), "R")}
    `);

  const RespEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.ShiftBreak)
    .setTitle(BaseEmbedTitle)
    .setFields({ name: "Current Shift", value: FieldDescription });

  const InteractReply = await Interaction[ReplyMethod]({
    components: [ButtonsActionRow.updateButtons({ start: false, break: true, end: false })],
    embeds: [RespEmbed],
  });

  // The received button interaction must be for the break button.
  return InteractReply.awaitMessageComponent(AwaitMsgCompOptions(Interaction))
    .then(async (ButtonInteract) => {
      await ButtonInteract.deferUpdate();
      const UpdatedShift = await ShiftActive.breakEnd(ButtonInteract.createdTimestamp);
      const EndedBreak = UpdatedShift.events.breaks.findLast(() => true);

      return Promise.all([
        ShiftActionLogger.LogShiftBreakEnd(UpdatedShift as any, ButtonInteract),
        InteractReply.edit({
          components: [],
          embeds: [
            new EmbedBuilder()
              .setColor(Embeds.Colors.ShiftStart)
              .setTitle("Shift Break Ended")
              .setFields({
                name: "Current Shift",
                value: Dedent(`
                  **Status:** ${Emojis.Online} On Duty
                  **Shift Started:** ${FormatTime(UpdatedShift.start_timestamp, "R")}
                  **Ended Break Time:** ${HumanizeDuration(EndedBreak![1] - EndedBreak![0])}
                  **Total Break Time:** ${HumanizeDuration(UpdatedShift.durations.on_break)}
                  `),
              }),
          ],
        }),
        HandleRoleAssignment(
          "on-duty",
          ButtonInteract.client,
          ButtonInteract.guildId,
          ButtonInteract.user.id
        ),
      ]);
    })
    .catch((Err) => CollectorExceptionHandler(Err, InteractReply as any));
}

async function HandleShiftEnd(
  ShiftActive: ExtraTypings.HydratedShiftDocument,
  ButtonInteract: ButtonInteraction<"cached">,
  ShiftDataInfo: string,
  TotalBreakTime: string | null,
  Reply: InteractionResponse<true>
) {
  const UpdatedShift = await ShiftActive.end(ButtonInteract.createdTimestamp);
  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.ShiftEnd)
    .setTitle("Shift Ended")
    .setTimestamp(UpdatedShift.end_timestamp)
    .setFooter({ text: `Shift Type: ${UpdatedShift.type}` })
    .setFields(
      {
        name: "All Time Info:",
        value: ShiftDataInfo,
      },
      {
        name: "Current Shift:",
        value: Dedent(`
            **Status:** ${Emojis.Offline} Ended (Off-Duty)
            **Total Shift Time:** ${HumanizeDuration(UpdatedShift.durations.total)}
            ${TotalBreakTime || ""}
          `),
      },
      {
        name: "Shift Statics:",
        value: Dedent(`
            **Arrests Made:** \`${UpdatedShift.events.arrests}\`
            **Citations Issued:** \`${UpdatedShift.events.citations}\`
          `),
      }
    );

  return Promise.all([
    ShiftActionLogger.LogShiftEnd(UpdatedShift, ButtonInteract),
    Reply.edit({ components: [], embeds: [ReplyEmbed] }),
    HandleRoleAssignment(
      "off-duty",
      ButtonInteract.client,
      ButtonInteract.guildId,
      ButtonInteract.user.id
    ),
  ]);
}

/**
 * @param Interaction
 * @returns
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const GuildSettings = await GetGuildSettings(Interaction.guildId);
  if (!GuildSettings) {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(Interaction, true);
  }

  const ShiftTypes = GuildSettings.shifts.types;
  const CmdShiftType = Interaction.options.getString("type")?.trim();
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
      .replyToInteract(Interaction, true);
  }

  const IsUsageAllowed = await HandleShiftTypeRestrictions(
    Interaction,
    ShiftTypes,
    TargetShiftType
  );

  // Or if the user is not allowed to use a specific shift type.
  if (!IsUsageAllowed) {
    return new UnauthorizedEmbed()
      .useErrTemplate("UnauthorizedShiftTypeUsage")
      .replyToInteract(Interaction, true);
  }

  await Interaction.deferReply();
  const ShiftActive = await GetShiftActive({
    ShiftType: TargetShiftType,
    UserOnly: true,
    Interaction,
  });

  const UserShiftsData = await GetMainShiftsData(
    {
      user: Interaction.user.id,
      guild: Interaction.guildId,
      type: TargetShiftType,
    },
    !!ShiftActive
  );

  const ShiftsInfo = Dedent(`
      **Shift Count:** \`${UserShiftsData.shift_count}\`
      **Total On-Duty Time:** ${UserShiftsData.total_onduty}
      **Average On-Duty Time:** ${UserShiftsData.avg_onduty}
    `);

  const BaseEmbedTitle = `Shift Management: \`${TargetShiftType}\` Type`;
  const ButtonsActionRow = GetManagementButtons(Interaction, ShiftActive);
  const DisablePrompt = async (Prompt: InteractionResponse<true>) => {
    return Prompt.edit({
      components: [
        ButtonsActionRow.updateButtons({
          start: false,
          break: false,
          end: false,
        }),
      ],
    });
  };

  const CollectorExceptionHandler = async (Err: Error, Prompt: InteractionResponse<true>) => {
    if (Err.message.match(/reason: time/)) {
      await DisablePrompt(Prompt);
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion errors */
    } else {
      throw Err;
    }
  };

  if (!ShiftActive) {
    return HandleNonActiveShift(
      BaseEmbedTitle,
      ShiftsInfo,
      Interaction,
      ButtonsActionRow,
      TargetShiftType
    );
  }

  if (ShiftActive.isBreakActive()) {
    return HandleOnBreakShift(
      ShiftActive,
      BaseEmbedTitle,
      Interaction,
      ButtonsActionRow,
      CollectorExceptionHandler
    );
  }

  const TotalBreakTime =
    ShiftActive.durations.on_break > 500
      ? `**Total Break Time:** ${HumanizeDuration(ShiftActive.durations.on_break)}`
      : null;

  const RespEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.ShiftStart)
    .setTitle(!ShiftActive ? BaseEmbedTitle : `Shift Management: \`${ShiftActive.type}\` Type`)
    .setFields(
      {
        name: "All Time Info:",
        value: ShiftsInfo,
      },
      {
        name: "Current Shift:",
        value: Dedent(`
          **Status:** ${Emojis.Online} On Duty
          **Shift Started:** ${FormatTime(ShiftActive.start_timestamp, "R")}
          ${TotalBreakTime || ""}
        `),
      }
    );

  const Reply = await (
    Interaction[Interaction.deferred ? "editReply" : "reply"] as typeof Interaction.reply
  )({
    components: [ButtonsActionRow.updateButtons({ start: false, break: true, end: true })],
    embeds: [RespEmbed],
  });

  return Reply.awaitMessageComponent(AwaitMsgCompOptions(Interaction))
    .then(async (ButtonInteract) => {
      await ButtonInteract.deferUpdate();
      if (ButtonInteract.customId.startsWith("dm-break")) {
        return HandleShiftBreakStart(ShiftActive, ButtonInteract, TotalBreakTime, Reply);
      } else {
        return HandleShiftEnd(ShiftActive, ButtonInteract, ShiftsInfo, TotalBreakTime, Reply);
      }
    })
    .catch((Err) => CollectorExceptionHandler(Err, Reply));
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
