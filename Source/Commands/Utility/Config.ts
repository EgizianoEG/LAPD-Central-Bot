/* eslint-disable sonarjs/no-duplicate-string */
import {
  Message,
  ButtonStyle,
  ChannelType,
  roleMention,
  EmbedBuilder,
  ModalBuilder,
  MessageFlags,
  ButtonBuilder,
  ComponentType,
  TextInputStyle,
  channelMention,
  ActionRowBuilder,
  TextInputBuilder,
  ButtonInteraction,
  InteractionResponse,
  SlashCommandBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  InteractionContextType,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  ModalActionRowComponentBuilder,
} from "discord.js";

import { Emojis } from "@Config/Shared.js";
import { GetErrorId } from "@Utilities/Strings/Random.js";
import { milliseconds } from "date-fns/milliseconds";
import { ArraysAreEqual } from "@Utilities/Other/ArraysAreEqual.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";
import GuildModel from "@Models/Guild.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
const ListFormatter = new Intl.ListFormat("en");
const MillisInDay = milliseconds({ days: 1 });
const BaseEmbedColor = "#5f9ea0";
const FileLabel = "Commands:Utility:Config";

type GuildSettings = NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>;
enum ConfigTopics {
  ShowConfigurations = "app-config-vc",
  BasicConfiguration = "app-config-bc",
  ShiftConfiguration = "app-config-sc",
  LeaveConfiguration = "app-config-loa",
  DutyActConfiguration = "app-config-da",
  AdditionalConfiguration = "app-config-ac",
}

/**
 * Configuration Topics Action Ids mapping.
 */
const CTAIds = {
  [ConfigTopics.BasicConfiguration]: {
    RobloxAuthRequired: `${ConfigTopics.BasicConfiguration}-rar`,
    MgmtRoles: `${ConfigTopics.BasicConfiguration}-mr`,
    StaffRoles: `${ConfigTopics.BasicConfiguration}-sr`,
  },

  [ConfigTopics.ShiftConfiguration]: {
    ModuleEnabled: `${ConfigTopics.ShiftConfiguration}-me`,
    LogChannel: `${ConfigTopics.ShiftConfiguration}-lc`,
    OnDutyRoles: `${ConfigTopics.ShiftConfiguration}-odr`,
    OnBreakRoles: `${ConfigTopics.ShiftConfiguration}-obr`,
  },

  [ConfigTopics.LeaveConfiguration]: {
    ModuleEnabled: `${ConfigTopics.LeaveConfiguration}-me`,
    RequestsChannel: `${ConfigTopics.LeaveConfiguration}-rc`,
    LogChannel: `${ConfigTopics.LeaveConfiguration}-lc`,
    OnLeaveRole: `${ConfigTopics.LeaveConfiguration}-olr`,
  },

  [ConfigTopics.DutyActConfiguration]: {
    ModuleEnabled: `${ConfigTopics.DutyActConfiguration}-me`,
    ArrestLogLocalChannel: `${ConfigTopics.DutyActConfiguration}-alc`,
    CitationLogLocalChannel: `${ConfigTopics.DutyActConfiguration}-clc`,
    IncidentLogLocalChannel: `${ConfigTopics.DutyActConfiguration}-ilc`,

    OutsideArrestLogChannel: `${ConfigTopics.DutyActConfiguration}-oalc`,
    OutsideCitationLogChannel: `${ConfigTopics.DutyActConfiguration}-oclc`,
  },

  [ConfigTopics.AdditionalConfiguration]: {
    DActivitiesDeletionInterval: `${ConfigTopics.AdditionalConfiguration}-dadi`,
    UserTextInputFilteringEnabled: `${ConfigTopics.AdditionalConfiguration}-utfe`,
  },
};

// ---------------------------------------------------------------------------------------
// General Helpers:
// ----------------
function GetHumanReadableLogDeletionInterval(Interval: number) {
  const IntervalInDays = Interval / MillisInDay;
  if (IntervalInDays > 1) {
    return `${IntervalInDays} Days`;
  } else if (IntervalInDays === 1) {
    return "One Day";
  } else {
    return "Never";
  }
}

// ---------------------------------------------------------------------------------------
// Embed & Component Getters:
// --------------------------
function GetConfigTopicConfirmAndBackBtns(
  CmdInteract: SlashCommandInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  ConfigTopicId: ConfigTopics
) {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setLabel("Confirm and Save")
      .setEmoji(Emojis.WhiteCheck)
      .setStyle(ButtonStyle.Success)
      .setCustomId(`${ConfigTopicId}-cfm:${CmdInteract.user.id}`),
    new ButtonBuilder()
      .setLabel("Back")
      .setEmoji(Emojis.WhiteBack)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(`${ConfigTopicId}-bck:${CmdInteract.user.id}`)
  );
}

function GetConfigTopicsDropdownMenu(CmdInteract: SlashCommandInteraction<"cached">) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`app-config:${CmdInteract.user.id}`)
      .setPlaceholder("Select a topic...")
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Basic Configuration")
          .setDescription("The app's basic settings such as staff and management roles.")
          .setValue(ConfigTopics.BasicConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Shift Module Configuration")
          .setDescription("Set on-duty and on-break roles, activities channel, and more")
          .setValue(ConfigTopics.ShiftConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Leave of Absence Module Configuration")
          .setDescription("Set on-leave role, requests channel, and more.")
          .setValue(ConfigTopics.LeaveConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Duty Activities Module Configuration")
          .setDescription("Set arrest, citation, and incident log channels and more.")
          .setValue(ConfigTopics.DutyActConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Additional Configurations")
          .setDescription("Other app settings.")
          .setValue(ConfigTopics.AdditionalConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Show All Configurations")
          .setDescription("Shows the app's current configuration for all listed above.")
          .setValue(ConfigTopics.ShowConfigurations)
      )
  );
}

function GetBasicConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  GuildConfig: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  const RobloxAuthorizationAR = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setPlaceholder("Roblox Authorization Required")
      .setDisabled(true)
      .setMinValues(1)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.BasicConfiguration].RobloxAuthRequired}:${CmdInteract.user.id}`
      )
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Enabled")
          .setValue("true")
          .setDescription("Enable the Roblox account linking requirement.")
          .setDefault(GuildConfig.require_authorization),
        new StringSelectMenuOptionBuilder()
          .setLabel("Disabled")
          .setValue("false")
          .setDescription("Disable the Roblox account linking requirement.")
          .setDefault(!GuildConfig.require_authorization)
      )
  );

  const StaffRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`${CTAIds[ConfigTopics.BasicConfiguration].StaffRoles}:${CmdInteract.user.id}`)
      .setDefaultRoles(GuildConfig.role_perms.staff)
      .setPlaceholder("Staff Roles")
      .setMinValues(0)
      .setMaxValues(8)
  );

  const ManagementRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`${CTAIds[ConfigTopics.BasicConfiguration].MgmtRoles}:${CmdInteract.user.id}`)
      .setDefaultRoles(GuildConfig.role_perms.management)
      .setPlaceholder("Management Roles")
      .setMinValues(0)
      .setMaxValues(8)
  );

  return [RobloxAuthorizationAR, StaffRolesAR, ManagementRolesAR] as const;
}

function GetShiftModuleConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached">,
  ShiftModuleConfig: GuildSettings["shift_management"]
) {
  const ModuleEnabledAR = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setPlaceholder("Module Enabled/Disabled")
      .setMinValues(1)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.ShiftConfiguration].ModuleEnabled}:${CmdInteract.user.id}`
      )
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Enabled")
          .setValue("true")
          .setDescription("Allow the usage of shift management commands.")
          .setDefault(ShiftModuleConfig.enabled),
        new StringSelectMenuOptionBuilder()
          .setLabel("Disabled")
          .setValue("false")
          .setDescription("Prevent the usage of shift management commands.")
          .setDefault(!ShiftModuleConfig.enabled)
      )
  );

  const ShiftLogChannelAR = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setDefaultChannels(ShiftModuleConfig.log_channel ? [ShiftModuleConfig.log_channel] : [])
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setCustomId(`${CTAIds[ConfigTopics.ShiftConfiguration].LogChannel}:${CmdInteract.user.id}`)
      .setPlaceholder("Shift Log Channel")
      .setMinValues(0)
      .setMaxValues(1)
  );

  const OnDutyRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setMinValues(0)
      .setMaxValues(3)
      .setPlaceholder("On-Duty Role(s)")
      .setDefaultRoles(ShiftModuleConfig.role_assignment.on_duty)
      .setCustomId(`${CTAIds[ConfigTopics.ShiftConfiguration].OnDutyRoles}:${CmdInteract.user.id}`)
  );

  const OnBreakRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setMinValues(0)
      .setMaxValues(3)
      .setPlaceholder("On-Break Role(s)")
      .setDefaultRoles(ShiftModuleConfig.role_assignment.on_break)
      .setCustomId(`${CTAIds[ConfigTopics.ShiftConfiguration].OnBreakRoles}:${CmdInteract.user.id}`)
  );

  return [ModuleEnabledAR, ShiftLogChannelAR, OnDutyRolesAR, OnBreakRolesAR] as const;
}

function GetLeaveModuleConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached">,
  LeaveNoticesConfig: GuildSettings["leave_notices"]
) {
  const ModuleEnabledAR = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setPlaceholder("Module Enabled/Disabled")
      .setMinValues(1)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.LeaveConfiguration].ModuleEnabled}:${CmdInteract.user.id}`
      )
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Enabled")
          .setValue("true")
          .setDescription("Allow the usage of leave of absence commands.")
          .setDefault(LeaveNoticesConfig.enabled),
        new StringSelectMenuOptionBuilder()
          .setLabel("Disabled")
          .setValue("false")
          .setDescription("Prevent the usage of leave of absence commands.")
          .setDefault(!LeaveNoticesConfig.enabled)
      )
  );

  const OnLeaveRoleAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`${CTAIds[ConfigTopics.LeaveConfiguration].OnLeaveRole}:${CmdInteract.user.id}`)
      .setDefaultRoles(LeaveNoticesConfig.leave_role ? [LeaveNoticesConfig.leave_role] : [])
      .setPlaceholder("On-Leave Role")
      .setMinValues(0)
      .setMaxValues(1)
  );

  if (LeaveNoticesConfig.leave_role) {
    OnLeaveRoleAR.components[0].setDefaultRoles(LeaveNoticesConfig.leave_role);
  }

  const LeaveRequestsChannelAR = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setMinValues(0)
      .setMaxValues(1)
      .setPlaceholder("Leave Requests Channel")
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setCustomId(
        `${CTAIds[ConfigTopics.LeaveConfiguration].RequestsChannel}:${CmdInteract.user.id}`
      )
      .setDefaultChannels(
        LeaveNoticesConfig.requests_channel ? [LeaveNoticesConfig.requests_channel] : []
      )
  );

  const LeaveLogChannelAR = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setMinValues(0)
      .setMaxValues(1)
      .setPlaceholder("Leave Activities Log Channel")
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setCustomId(`${CTAIds[ConfigTopics.LeaveConfiguration].LogChannel}:${CmdInteract.user.id}`)
      .setDefaultChannels(LeaveNoticesConfig.log_channel ? [LeaveNoticesConfig.log_channel] : [])
  );

  return [ModuleEnabledAR, OnLeaveRoleAR, LeaveRequestsChannelAR, LeaveLogChannelAR] as const;
}

function GetDutyActModuleConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached">,
  DActivitiesConfig: GuildSettings["duty_activities"]
) {
  const LocalArrestLogChannel = DActivitiesConfig.log_channels.arrests.find(
    (C) => !C.includes(":")
  );

  const LocalCitationLogChannel = DActivitiesConfig.log_channels.citations.find(
    (C) => !C.includes(":")
  );

  const ModuleEnabledAR = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setPlaceholder("Module Enabled/Disabled")
      .setMinValues(1)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.DutyActConfiguration].ModuleEnabled}:${CmdInteract.user.id}`
      )
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Enabled")
          .setValue("true")
          .setDescription("Allow the usage of 'log' commands.")
          .setDefault(DActivitiesConfig.enabled),
        new StringSelectMenuOptionBuilder()
          .setLabel("Disabled")
          .setValue("false")
          .setDescription("Prevent the usage of 'log' commands.")
          .setDefault(!DActivitiesConfig.enabled)
      )
  );

  const LocalCitsLogChannelAR = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setPlaceholder("Local Channel for Citation Logs")
      .setMinValues(0)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.DutyActConfiguration].CitationLogLocalChannel}:${CmdInteract.user.id}`
      )
  );

  const LocalArrestsLogChannelAR = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setPlaceholder("Local Channel for Arrest Reports")
      .setMinValues(0)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.DutyActConfiguration].ArrestLogLocalChannel}:${CmdInteract.user.id}`
      )
  );

  const SetOutsideLogChannelBtns = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setLabel("Set Outside Citation Log Channel")
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(
        `${CTAIds[ConfigTopics.DutyActConfiguration].OutsideCitationLogChannel}:${CmdInteract.user}`
      ),
    new ButtonBuilder()
      .setLabel("Set Outside Arrest Log Channel")
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(
        `${CTAIds[ConfigTopics.DutyActConfiguration].OutsideArrestLogChannel}:${CmdInteract.user}`
      )
  );

  if (LocalCitationLogChannel)
    LocalCitsLogChannelAR.components[0].setDefaultChannels(LocalCitationLogChannel);
  if (LocalArrestLogChannel)
    LocalArrestsLogChannelAR.components[0].setDefaultChannels(LocalArrestLogChannel);

  return [
    ModuleEnabledAR,
    LocalCitsLogChannelAR,
    LocalArrestsLogChannelAR,
    SetOutsideLogChannelBtns,
  ] as const;
}

function GetAdditionalConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached">,
  GuildConfig: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  const SetIntervalInDays = GuildConfig.duty_activities.log_deletion_interval / MillisInDay;
  const LogDelIntervalSMAR = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setPlaceholder("Log Deletion Interval")
      .setMinValues(1)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.AdditionalConfiguration].DActivitiesDeletionInterval}:${CmdInteract.user.id}`
      )
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Disable Log Deletion")
          .setValue("0d")
          .setDescription("Never delete logs."),
        new StringSelectMenuOptionBuilder()
          .setLabel("1 Day")
          .setValue("1d")
          .setDescription("Delete logs one day after they are made."),
        new StringSelectMenuOptionBuilder()
          .setLabel("3 Days")
          .setValue("3d")
          .setDescription("Delete logs three days after they are made."),
        new StringSelectMenuOptionBuilder()
          .setLabel("7 Days")
          .setValue("7d")
          .setDescription("Delete logs seven days after they are made."),
        new StringSelectMenuOptionBuilder()
          .setLabel("14 Days")
          .setValue("14d")
          .setDescription("Delete logs fourteen days after they are made."),
        new StringSelectMenuOptionBuilder()
          .setLabel("30 Days")
          .setValue("30d")
          .setDescription("Delete logs thirty days after they are made.")
      )
  );

  const IncidentLogChannelAR = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setMinValues(0)
      .setMaxValues(1)
      .setPlaceholder("Incident Report Channel")
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setDefaultChannels(
        [GuildConfig.duty_activities.log_channels.incidents].filter(Boolean) as string[]
      )
      .setCustomId(
        `${CTAIds[ConfigTopics.DutyActConfiguration].IncidentLogLocalChannel}:${CmdInteract.user.id}`
      )
  );

  const UTIFilteringEnabledAR = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setPlaceholder("Input Filtering Enabled/Disabled")
      .setMinValues(1)
      .setMaxValues(1)
      .setCustomId(
        `${CTAIds[ConfigTopics.AdditionalConfiguration].UserTextInputFilteringEnabled}:${CmdInteract.user.id}`
      )
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Enabled")
          .setValue("true")
          .setDescription("Enable filtering of member text input.")
          .setDefault(GuildConfig.utif_enabled),
        new StringSelectMenuOptionBuilder()
          .setLabel("Disabled")
          .setValue("false")
          .setDescription("Disable filtering of member text input (not recommended).")
          .setDefault(!GuildConfig.utif_enabled)
      )
  );

  LogDelIntervalSMAR.components[0].options.forEach((Option) => {
    if (Option.data.value === `${SetIntervalInDays}d`) {
      Option.setDefault(true);
    }
  });

  return [LogDelIntervalSMAR, IncidentLogChannelAR, UTIFilteringEnabledAR] as const;
}

function GetShowConfigurationsPageComponents(CmdInteract: SlashCommandInteraction<"cached">) {
  return [
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setLabel("Back to Configration Topics")
        .setCustomId(`app-config-bck:${CmdInteract.user.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(Emojis.WhiteBack)
    ),
  ];
}

// ---------------------------------------------------------------------------------------
function GetBasicConfigExplanationEmbed() {
  return new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Application Basic Configuration")
    .setDescription(
      Dedent(`
        1. **Roblox Authorization Required**
          Enable or disable the app's Roblox authorization requirement. If enabled, the app requires users to have their Roblox account linked before \
          they can use specific staff commands, such as \`log\` and \`duty\` commands. This option is enabled and cannot be changed at the moment by default.
        2. **Staff Roles**
          The roles for which holders will be considered staff members and will be able to execute staff-specific commands.
        3. **Management Roles**
          The roles whose members can execute management-specific commands (e.g., \`/duty admin\`, \`/loa admin\`, etc), in addition to staff-specific commands. \
          Members with administrator permissions will be able to execute management-specific commands regardless if they have staff or management roles.
      `)
        .replace(/\.\s{2,}(\w)/g, ". $1")
        .replace(/(\w)\s{2,}(\w)/g, "$1 $2")
    );
}

function GetShiftModuleConfigExplanationEmbed() {
  return new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Shift Module Configuration")
    .setDescription(
      Dedent(`
        1. **Module Enabled**
          Toggle whether to enable or disable shift management commands, with certain exceptions included.
        2. **Shift Log Channel**
          The channel where notices will be sent when a shift starts, pauses, ends, is voided, or when a shift data wipe or modification occurs.
        2. **Shift Role Assignment**
          - **On-Duty**
            The role(s) that will be assigned to staff members while being on duty.
          - **On-Break**
            The role(s) that will be assigned to staff members while being on break.
      `)
    );
}

function GetLeaveModuleConfigExplanationEmbed() {
  return new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Leave Module Configuration")
    .setDescription(
      Dedent(`
        1. **Module Enabled**
          Whether to allow the usage of leave of absence commands or not, with certain exceptions included.
        2. **On Leave Role**
          The role that will be assigned to members when their leave of absence starts, and will be removed when their leave ends.
        3. **Leave Requests Channel**
          The channel used to send leave requests submitted by members. Setting this channel is optional, but if not set, management \
          staff will need to use the \`loa admin\` command to review members' pending requests.
        4. **Leave Logs Channel**
          A separate channel used to log various activities in the leave of absence module, including leave approvals, denials, cancellations, and terminations.
      `)
        .replace(/\.\s{2,}(\w)/g, ". $1")
        .replace(/(\w)\s{2,}(\w)/g, "$1 $2")
    );
}

function GetDutyActivitiesModuleConfigExplanationEmbed() {
  return new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Duty Activities Module Configuration")
    .setDescription(
      Dedent(`
        1. **Module Enabled**
          Toggle whether this module is enabled. Disabling it will prevent the use of any related commands, certain exceptions may be included.
        2. **Citation Log Channel**
          The local channel within this server that will be used to log any citations issued by staff members.
        3. **Arrest Log Channel**
          The local channel within this server that will be used to log any arrests reported by staff members.
        4. **Outside Server Connections**
          - **Outside Citation Log Channel**
            Add an external citation logs channel (from another server) to be used alongside the local channel.
          - **Outside Arrest Log Channel**
            Add an external arrest logs channel (from another server) to be used alongside the local set one.
      `)
    );
}

function GetAdditionalConfigExplanationEmbed() {
  return new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("Additional App Configuration")
    .setDescription(
      Dedent(`
        1. **Log Deletion Interval**
          Specify the interval, in days, at which citation, arrest, and incident logs will be automatically deleted. \
          The default setting is to never delete logs. Note: changing this setting will affect both existing and new logs.
        2. **Incident Report Channel**
          Select the channel where submitted incident reports will be sent. This channel should be accessible to relevant \
          staff members for reviewing and managing incident reports.
        3. **Member Text Inputs Filtering**
          Enable or disable filtering of member text input in certain commands to help prevent abuse within the application. \
          This setting is enabled by default and uses the server's auto-moderation rules to attempt to redact profane words \
          and offensive language, in addition to the link filtering provided by the application.
      `)
        .replace(/\.\s{2,}(\w)/g, ". $1")
        .replace(/(\w)\s{2,}(\w)/g, "$1 $2")
    );
}

// ---------------------------------------------------------------------------------------
// Configuration Handlers:
// -----------------------
async function HandleOutsideLogChannelBtnInteracts(
  BtnInteract: ButtonInteraction<"cached">,
  CurrentLogChannels: string[]
): Promise<null | undefined | string> {
  const CurrLogChannel = CurrentLogChannels.find((C) => C.includes(":"));
  const LogChannelTopic = BtnInteract.customId.startsWith(
    CTAIds[ConfigTopics.DutyActConfiguration].OutsideArrestLogChannel
  )
    ? "Arrest Reports"
    : "Citation Logs";

  const InputModal = new ModalBuilder()
    .setTitle(`Outside Log Channel - ${LogChannelTopic}`)
    .setCustomId(BtnInteract.customId)
    .setComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Channel in The Format: [ServerId:ChannelId]")
          .setPlaceholder("ServerID:ChannelID")
          .setCustomId("channel_id")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMinLength(31)
          .setMaxLength(45)
      )
    );

  if (CurrLogChannel) InputModal.components[0].components[0].setValue(CurrLogChannel);
  await BtnInteract.showModal(InputModal);
  const ModalSubmission = await BtnInteract.awaitModalSubmit({
    filter: (MS) => InputModal.data.custom_id === MS.customId,
    time: 5 * 60 * 1000,
  }).catch(() => null);

  if (ModalSubmission) {
    const TypedChannel = ModalSubmission.fields.getTextInputValue("channel_id").trim();

    if (!TypedChannel) return null;
    if (TypedChannel.match(/^\d{15,22}:\d{15,22}$/)) {
      if (TypedChannel === CurrLogChannel) {
        ModalSubmission.deferUpdate().catch(() => null);
        return CurrLogChannel;
      }

      const [GuildId, ChannelId] = TypedChannel.split(":");
      const GuildFound = await ModalSubmission.client.guilds.fetch(GuildId).catch(() => null);
      const ChannelFound = await GuildFound?.channels.fetch(ChannelId).catch(() => null);

      if (!GuildFound) {
        new ErrorEmbed()
          .useErrTemplate("DiscordGuildNotFound", GuildId)
          .replyToInteract(ModalSubmission, true);
        return CurrLogChannel;
      } else if (!ChannelFound) {
        new ErrorEmbed()
          .useErrTemplate("DiscordChannelNotFound", ChannelId)
          .replyToInteract(ModalSubmission, true);
        return CurrLogChannel;
      } else {
        const GuildMember = await GuildFound.members.fetch(ModalSubmission.user).catch(() => null);
        if (!GuildMember) {
          new ErrorEmbed()
            .useErrTemplate("NotJoinedInGuild")
            .replyToInteract(ModalSubmission, true);
          return CurrLogChannel;
        } else if (!GuildMember.permissions.has(PermissionFlagsBits.Administrator)) {
          new ErrorEmbed()
            .useErrTemplate("InsufficientAdminPerms")
            .replyToInteract(ModalSubmission, true);
          return CurrLogChannel;
        }
      }

      ModalSubmission.deferUpdate().catch(() => null);
      return TypedChannel;
    } else {
      new ErrorEmbed()
        .useErrTemplate("InvalidGuildChannelFormat")
        .replyToInteract(ModalSubmission, true);

      return CurrLogChannel;
    }
  } else {
    return CurrLogChannel;
  }
}

async function HandleBasicConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  BasicConfigPrompt: Message<true> | InteractionResponse<true>,
  CurrConfiguration: GuildSettings
) {
  let StaffRoles: string[] = CurrConfiguration.role_perms.staff.slice();
  let ManagementRoles: string[] = CurrConfiguration.role_perms.management.slice();
  let RobloxAuthorizationRequired: boolean = CurrConfiguration.require_authorization;

  const BCCompActionCollector = BasicConfigPrompt.createMessageComponentCollector<
    ComponentType.Button | ComponentType.RoleSelect | ComponentType.StringSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const HandleSettingsSave = async (ButtonInteract: ButtonInteraction<"cached">) => {
    if (
      CurrConfiguration.require_authorization === RobloxAuthorizationRequired &&
      ArraysAreEqual(CurrConfiguration.role_perms.staff, StaffRoles) &&
      ArraysAreEqual(CurrConfiguration.role_perms.management, ManagementRoles)
    ) {
      return new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "basic")
        .replyToInteract(ButtonInteract, true);
    }

    if (!ButtonInteract.deferred)
      await ButtonInteract.deferReply({ flags: MessageFlags.Ephemeral });

    CurrConfiguration = await GuildModel.findByIdAndUpdate(
      ButtonInteract.guildId,
      {
        $set: {
          "settings.role_perms.staff": StaffRoles,
          "settings.role_perms.management": ManagementRoles,
          "settings.require_authorization": RobloxAuthorizationRequired,
        },
      },
      {
        new: true,
        upsert: true,
        strict: true,
        runValidators: true,
        projection: {
          settings: 1,
        },
      }
    ).then((GuildDoc) => GuildDoc?.settings);

    if (CurrConfiguration) {
      const SetStaffRoles = CurrConfiguration.role_perms.staff.map((R) => roleMention(R));
      const SetMgmtRoles = CurrConfiguration.role_perms.management.map((R) => roleMention(R));
      const FormattedDesc = Dedent(`
        Successfully set/updated the app's basic configuration.
        Current Configuration:
        - **Roblox Auth Required:** ${RobloxAuthorizationRequired ? "Yes" : "No"}
        - **Staff Role(s):**
          > ${SetStaffRoles.length ? ListFormatter.format(SetStaffRoles) : "*None*"}
        - **Management Role(s):**
          > ${SetMgmtRoles.length ? ListFormatter.format(SetMgmtRoles) : "*None*"}
      `);

      return new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(ButtonInteract);
    } else {
      return new ErrorEmbed().useErrTemplate("AppError").replyToInteract(ButtonInteract);
    }
  };

  BCCompActionCollector.on("collect", async (RecInteract) => {
    try {
      if (!RecInteract.isButton()) RecInteract.deferUpdate().catch(() => null);
      if (RecInteract.isButton()) {
        if (RecInteract.customId.startsWith(`${ConfigTopics.BasicConfiguration}-cfm`)) {
          await HandleSettingsSave(RecInteract);
        } else if (RecInteract.customId.startsWith(`${ConfigTopics.BasicConfiguration}-bck`)) {
          BCCompActionCollector.stop("Back");
          await RecInteract.deferUpdate();
          return Callback(CmdInteract);
        }
      } else if (RecInteract.isRoleSelectMenu()) {
        if (RecInteract.customId.startsWith(CTAIds[ConfigTopics.BasicConfiguration].StaffRoles)) {
          StaffRoles = RecInteract.values;
        } else if (
          RecInteract.customId.startsWith(CTAIds[ConfigTopics.BasicConfiguration].MgmtRoles)
        ) {
          ManagementRoles = RecInteract.values;
        }
      } else if (
        RecInteract.customId.startsWith(CTAIds[ConfigTopics.BasicConfiguration].RobloxAuthRequired)
      ) {
        RobloxAuthorizationRequired = RecInteract.values[0] === "true";
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      new ErrorEmbed()
        .useErrTemplate("AppError")
        .setErrorId(ErrorId)
        .replyToInteract(RecInteract, true);

      AppLogger.error({
        message: "Failed to handle component interactions for basic app configuration;",
        error_id: ErrorId,
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });

  BCCompActionCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.includes("time") || EndReason.includes("idle")) {
      const LastInteract = Collected.last() || CmdInteract;
      if (!(await BasicConfigPrompt.fetch(true).catch(() => null))) return;
      await new InfoEmbed()
        .useInfoTemplate("TimedOutConfigPrompt")
        .setTitle("Timed Out - Basic Configuration")
        .replyToInteract(LastInteract);
    }
  });
}

async function HandleAdditionalConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  AddConfigPrompt: Message<true> | InteractionResponse<true>,
  CurrConfiguration: GuildSettings
) {
  let LogDeletionInterval = CurrConfiguration.duty_activities.log_deletion_interval;
  let IncidentLogChannel = CurrConfiguration.duty_activities.log_channels.incidents;
  let UTIFEnabled = CurrConfiguration.utif_enabled;

  const BCCompActionCollector = AddConfigPrompt.createMessageComponentCollector<
    ComponentType.Button | ComponentType.StringSelect | ComponentType.ChannelSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const HandleSettingsSave = async (ButtonInteract: ButtonInteraction<"cached">) => {
    if (
      CurrConfiguration.duty_activities.log_deletion_interval === LogDeletionInterval &&
      CurrConfiguration.duty_activities.log_channels.incidents === IncidentLogChannel &&
      CurrConfiguration.utif_enabled === UTIFEnabled
    ) {
      return new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "additional")
        .replyToInteract(ButtonInteract, true);
    }

    if (!ButtonInteract.deferred)
      await ButtonInteract.deferReply({ flags: MessageFlags.Ephemeral });

    CurrConfiguration = await GuildModel.findByIdAndUpdate(
      CmdInteract.guildId,
      {
        $set: {
          "settings.duty_activities.log_deletion_interval": LogDeletionInterval,
          "settings.duty_activities.log_channels.incidents": IncidentLogChannel,
          "settings.utif_enabled": UTIFEnabled,
        },
      },
      {
        new: true,
        upsert: true,
        strict: true,
        runValidators: true,
        projection: {
          settings: 1,
        },
      }
    ).then((GuildDoc) => GuildDoc?.settings);

    if (CurrConfiguration) {
      const LDIFormatted = GetHumanReadableLogDeletionInterval(
        CurrConfiguration.duty_activities.log_deletion_interval
      );

      const ILSetChannel = CurrConfiguration.duty_activities.log_channels.incidents
        ? channelMention(CurrConfiguration.duty_activities.log_channels.incidents)
        : "None";

      const FormattedDesc = Dedent(`
        Successfully set/updated the app's additional configuration.
        Current Configuration:
        - **Log Deletion Interval:** ${LDIFormatted}
        - **Incidents Log Channel:** ${ILSetChannel}
        - **Input Filtering Enabled:** ${CurrConfiguration.utif_enabled ? "Yes" : "No"}
      `);

      return new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(ButtonInteract);
    } else {
      return new ErrorEmbed().useErrTemplate("AppError").replyToInteract(ButtonInteract);
    }
  };

  BCCompActionCollector.on("collect", async (RecInteract) => {
    try {
      if (RecInteract.isButton()) {
        if (RecInteract.customId.startsWith(`${ConfigTopics.AdditionalConfiguration}-cfm`)) {
          await HandleSettingsSave(RecInteract);
        } else if (RecInteract.customId.startsWith(`${ConfigTopics.AdditionalConfiguration}-bck`)) {
          BCCompActionCollector.stop("Back");
          await RecInteract.deferUpdate();
          return Callback(CmdInteract);
        }
      } else {
        if (
          RecInteract.isStringSelectMenu() &&
          RecInteract.customId.startsWith(
            CTAIds[ConfigTopics.AdditionalConfiguration].DActivitiesDeletionInterval
          )
        ) {
          LogDeletionInterval = Number(RecInteract.values[0].slice(0, -1)) || 0;
        }

        if (
          RecInteract.isChannelSelectMenu() &&
          RecInteract.customId.startsWith(
            CTAIds[ConfigTopics.DutyActConfiguration].IncidentLogLocalChannel
          )
        ) {
          IncidentLogChannel = RecInteract.values[0];
        }

        if (
          RecInteract.isStringSelectMenu() &&
          RecInteract.customId.startsWith(
            CTAIds[ConfigTopics.AdditionalConfiguration].UserTextInputFilteringEnabled
          )
        ) {
          UTIFEnabled = RecInteract.values[0] === "true";
        }

        await RecInteract.deferUpdate();
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      new ErrorEmbed()
        .useErrTemplate("AppError")
        .setErrorId(ErrorId)
        .replyToInteract(RecInteract, true);

      AppLogger.error({
        message: "Failed to handle component interactions for additional app configuration;",
        error_id: ErrorId,
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });

  BCCompActionCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.includes("time") || EndReason.includes("idle")) {
      const LastInteract = Collected.last() || CmdInteract;
      if (!(await AddConfigPrompt.fetch(true).catch(() => null))) return;
      await new InfoEmbed()
        .useInfoTemplate("TimedOutConfigPrompt")
        .setTitle("Timed Out - Additional Configuration")
        .replyToInteract(LastInteract);
    }
  });
}

async function HandleShiftConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  ConfigPrompt: Message<true> | InteractionResponse<true>,
  SMCurrConfiguration: GuildSettings["shift_management"]
) {
  let ModuleEnabled: boolean = SMCurrConfiguration.enabled;
  let OnDutyRoles: string[] = SMCurrConfiguration.role_assignment.on_duty.slice();
  let OnBreakRoles: string[] = SMCurrConfiguration.role_assignment.on_break.slice();
  let LogChannel = SMCurrConfiguration.log_channel;

  const SCCompActionCollector = ConfigPrompt.createMessageComponentCollector<
    ComponentType.Button | ComponentType.RoleSelect | ComponentType.StringSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const HandleSettingsSave = async (ButtonInteract: ButtonInteraction<"cached">) => {
    if (
      SMCurrConfiguration.enabled === ModuleEnabled &&
      SMCurrConfiguration.log_channel === LogChannel &&
      ArraysAreEqual(SMCurrConfiguration.role_assignment.on_duty, OnDutyRoles) &&
      ArraysAreEqual(SMCurrConfiguration.role_assignment.on_break, OnBreakRoles)
    ) {
      return new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "shifts")
        .replyToInteract(ButtonInteract, true);
    }

    if (!ButtonInteract.deferred)
      await ButtonInteract.deferReply({ flags: MessageFlags.Ephemeral });

    SMCurrConfiguration = await GuildModel.findByIdAndUpdate(
      CmdInteract.guildId,
      {
        $set: {
          "settings.shift_management.enabled": ModuleEnabled,
          "settings.shift_management.log_channel": LogChannel,
          "settings.shift_management.role_assignment.on_duty": OnDutyRoles,
          "settings.shift_management.role_assignment.on_break": OnBreakRoles,
        },
      },
      {
        new: true,
        upsert: true,
        strict: true,
        runValidators: true,
        projection: {
          settings: 1,
        },
      }
    ).then((GuildDoc) => GuildDoc?.settings.shift_management);

    if (SMCurrConfiguration) {
      const SetLogChannel = SMCurrConfiguration.log_channel
        ? channelMention(SMCurrConfiguration.log_channel)
        : "`None`";
      const SetOnDutyRoles = SMCurrConfiguration.role_assignment.on_duty.map((R) => roleMention(R));
      const SetOnBreakRoles = SMCurrConfiguration.role_assignment.on_break.map((R) =>
        roleMention(R)
      );

      const FormattedDesc = Dedent(`
        Successfully set/updated the app's shifts configuration.
        Current Configuration:
        - **Module Enabled:** ${SMCurrConfiguration.enabled ? "Yes" : "No"}
        - **Shift Log Channel:** ${SetLogChannel}
        - **On-Duty Role(s):**
          > ${SetOnDutyRoles.length ? ListFormatter.format(SetOnDutyRoles) : "*None*"}
        - **On-Break Role(s):**
          > ${SetOnBreakRoles.length ? ListFormatter.format(SetOnBreakRoles) : "*None*"}
      `);

      return new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(ButtonInteract);
    } else {
      return new ErrorEmbed().useErrTemplate("AppError").replyToInteract(ButtonInteract);
    }
  };

  SCCompActionCollector.on("collect", async (RecInteract) => {
    const ActionId = RecInteract.customId;
    try {
      if (!RecInteract.isButton()) RecInteract.deferUpdate().catch(() => null);
      if (RecInteract.isButton() && ActionId.startsWith(`${ConfigTopics.ShiftConfiguration}-cfm`)) {
        await HandleSettingsSave(RecInteract);
      } else if (
        RecInteract.isButton() &&
        ActionId.startsWith(`${ConfigTopics.ShiftConfiguration}-bck`)
      ) {
        SCCompActionCollector.stop("Back");
        await RecInteract.deferUpdate();
        return Callback(CmdInteract);
      } else if (
        RecInteract.isStringSelectMenu() &&
        ActionId.startsWith(CTAIds[ConfigTopics.ShiftConfiguration].ModuleEnabled)
      ) {
        ModuleEnabled = RecInteract.values[0] === "true";
      } else if (RecInteract.isRoleSelectMenu()) {
        if (ActionId.startsWith(CTAIds[ConfigTopics.ShiftConfiguration].OnDutyRoles)) {
          OnDutyRoles = RecInteract.values;
        } else if (ActionId.startsWith(CTAIds[ConfigTopics.ShiftConfiguration].OnBreakRoles)) {
          OnBreakRoles = RecInteract.values;
        } else if (ActionId.startsWith(CTAIds[ConfigTopics.ShiftConfiguration].LogChannel)) {
          LogChannel = RecInteract.values[0] || null;
        }
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      new ErrorEmbed()
        .useErrTemplate("AppError")
        .setErrorId(ErrorId)
        .replyToInteract(RecInteract, true);

      AppLogger.error({
        message: "Failed to handle component interactions for shift management configuration;",
        error_id: ErrorId,
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });

  SCCompActionCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.includes("time") || EndReason.includes("idle")) {
      const LastInteract = Collected.last() || CmdInteract;
      if (!(await ConfigPrompt.fetch(true).catch(() => null))) return;
      return new InfoEmbed()
        .useInfoTemplate("TimedOutConfigPrompt")
        .setTitle("Timed Out - Shift Module Configuration")
        .replyToInteract(LastInteract);
    }
  });
}

async function HandleLeaveConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  ConfigPrompt: Message<true> | InteractionResponse<true>,
  LNCurrConfiguration: GuildSettings["leave_notices"]
) {
  let ModuleEnabled = LNCurrConfiguration.enabled;
  let OnLeaveRole = LNCurrConfiguration.leave_role;
  let LogChannel = LNCurrConfiguration.log_channel;
  let RequestsChannel = LNCurrConfiguration.requests_channel;

  const SCCompActionCollector = ConfigPrompt.createMessageComponentCollector<
    | ComponentType.Button
    | ComponentType.ChannelSelect
    | ComponentType.StringSelect
    | ComponentType.RoleSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const HandleSettingsSave = async (ButtonInteract: ButtonInteraction<"cached">) => {
    if (
      LNCurrConfiguration.enabled === ModuleEnabled &&
      LNCurrConfiguration.leave_role === OnLeaveRole &&
      LNCurrConfiguration.log_channel === LogChannel &&
      LNCurrConfiguration.requests_channel === RequestsChannel
    ) {
      return new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "leave notices")
        .replyToInteract(ButtonInteract, true);
    }

    if (!ButtonInteract.deferred)
      await ButtonInteract.deferReply({ flags: MessageFlags.Ephemeral });

    LNCurrConfiguration = await GuildModel.findByIdAndUpdate(
      CmdInteract.guildId,
      {
        $set: {
          "settings.leave_notices.enabled": ModuleEnabled,
          "settings.leave_notices.leave_role": OnLeaveRole,
          "settings.leave_notices.log_channel": LogChannel,
          "settings.leave_notices.requests_channel": RequestsChannel,
        },
      },
      {
        new: true,
        upsert: true,
        strict: true,
        runValidators: true,
        projection: {
          settings: 1,
        },
      }
    ).then((GuildDoc) => GuildDoc?.settings.leave_notices);

    if (LNCurrConfiguration) {
      const SetOnLeaveRole = LNCurrConfiguration.leave_role
        ? roleMention(LNCurrConfiguration.leave_role)
        : "`None`";
      const SetLogChannel = LNCurrConfiguration.log_channel
        ? channelMention(LNCurrConfiguration.log_channel)
        : "`None`";
      const SetRequestsChannel = LNCurrConfiguration.requests_channel
        ? channelMention(LNCurrConfiguration.requests_channel)
        : "`None`";

      const FormattedDesc = Dedent(`
        Successfully set/updated the app's leave notices module configuration.
        Current Configuration:
        - **Module Enabled:** ${LNCurrConfiguration.enabled ? "Yes" : "No"}
        - **On-Leave Role:** ${SetOnLeaveRole}
        - **Log Channel:** ${SetLogChannel}
        - **Requests Channel:** ${SetRequestsChannel}
      `);

      return new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(ButtonInteract);
    } else {
      return new ErrorEmbed().useErrTemplate("AppError").replyToInteract(ButtonInteract);
    }
  };

  SCCompActionCollector.on("collect", async (RecInteract) => {
    const ActionId = RecInteract.customId;
    try {
      if (!RecInteract.isButton()) RecInteract.deferUpdate().catch(() => null);
      if (RecInteract.isButton() && ActionId.startsWith(`${ConfigTopics.LeaveConfiguration}-cfm`)) {
        await HandleSettingsSave(RecInteract);
      } else if (
        RecInteract.isButton() &&
        ActionId.startsWith(`${ConfigTopics.LeaveConfiguration}-bck`)
      ) {
        SCCompActionCollector.stop("Back");
        await RecInteract.deferUpdate();
        return Callback(CmdInteract);
      } else if (
        RecInteract.isStringSelectMenu() &&
        ActionId.startsWith(CTAIds[ConfigTopics.LeaveConfiguration].ModuleEnabled)
      ) {
        ModuleEnabled = RecInteract.values[0] === "true";
      } else if (RecInteract.isChannelSelectMenu()) {
        if (ActionId.startsWith(CTAIds[ConfigTopics.LeaveConfiguration].LogChannel)) {
          LogChannel = RecInteract.values[0] || null;
        } else if (ActionId.startsWith(CTAIds[ConfigTopics.LeaveConfiguration].RequestsChannel)) {
          RequestsChannel = RecInteract.values[0] || null;
        }
      } else if (
        RecInteract.isRoleSelectMenu() &&
        ActionId.startsWith(CTAIds[ConfigTopics.LeaveConfiguration].OnLeaveRole)
      ) {
        OnLeaveRole = RecInteract.values[0] || null;
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      new ErrorEmbed()
        .useErrTemplate("AppError")
        .setErrorId(ErrorId)
        .replyToInteract(RecInteract, true);

      AppLogger.error({
        message: "Failed to handle component interactions for shift management configuration;",
        error_id: ErrorId,
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });

  SCCompActionCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.includes("time") || EndReason.includes("idle")) {
      const LastInteract = Collected.last() || CmdInteract;
      if (!(await ConfigPrompt.fetch(true).catch(() => null))) return;
      return new InfoEmbed()
        .useInfoTemplate("TimedOutConfigPrompt")
        .setTitle("Timed Out - Shift Module Configuration")
        .replyToInteract(LastInteract);
    }
  });
}

async function HandleDutyActivitiesConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  ConfigPrompt: Message<true> | InteractionResponse<true>,
  DACurrentConfig: GuildSettings["duty_activities"]
) {
  let ArrestReportsChannels = DACurrentConfig.log_channels.arrests.slice();
  let CitationsLogChannels = DACurrentConfig.log_channels.citations.slice();
  let ModuleEnabled = DACurrentConfig.enabled;

  const LCCompActionCollector = ConfigPrompt.createMessageComponentCollector<
    ComponentType.Button | ComponentType.ChannelSelect | ComponentType.StringSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const HandleSaveConfirmation = async (ButtonInteract: ButtonInteraction<"cached">) => {
    if (
      ModuleEnabled === DACurrentConfig.enabled &&
      ArraysAreEqual(DACurrentConfig.log_channels.arrests, ArrestReportsChannels) &&
      ArraysAreEqual(DACurrentConfig.log_channels.citations, CitationsLogChannels)
    ) {
      return new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "duty activities")
        .replyToInteract(ButtonInteract, true);
    }

    if (!ButtonInteract.deferred)
      await ButtonInteract.deferReply({ flags: MessageFlags.Ephemeral });

    DACurrentConfig = await GuildModel.findByIdAndUpdate(
      CmdInteract.guildId,
      {
        $set: {
          "settings.duty_activities.enabled": ModuleEnabled,
          "settings.duty_activities.log_channels.arrests": ArrestReportsChannels,
          "settings.duty_activities.log_channels.citations": CitationsLogChannels,
        },
      },
      {
        new: true,
        upsert: true,
        strict: true,
        runValidators: true,
        projection: {
          settings: 1,
        },
      }
    ).then((GuildDoc) => GuildDoc?.settings.duty_activities);

    if (DACurrentConfig) {
      const ARSetChannels = DACurrentConfig.log_channels.arrests.map((CI) =>
        channelMention(CI.match(/:?(\d+)$/)?.[1] || "0")
      );

      const CLSetChannels = DACurrentConfig.log_channels.citations.map((CI) =>
        channelMention(CI.match(/:?(\d+)$/)?.[1] || "0")
      );

      const FormattedDesc = Dedent(`
        Successfully set/updated the app's duty activities module configuration.
        Current Configuration:
        - **Module Enabled:** ${DACurrentConfig.enabled ? "Yes" : "No"}
        - **Arrest Reports Log Channel(s):**
          > ${ARSetChannels.length ? ListFormatter.format(ARSetChannels) : "*None*"}
        - **Citation Issued Log Channel(s):**
          > ${CLSetChannels.length ? ListFormatter.format(CLSetChannels) : "*None*"}
      `);

      return new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(ButtonInteract);
    } else {
      return new ErrorEmbed().useErrTemplate("AppError").replyToInteract(ButtonInteract);
    }
  };

  const HandleChannelSelectMenuSettings = async (
    SelectInteract: ChannelSelectMenuInteraction<"cached">
  ) => {
    const OptionId = SelectInteract.customId;

    if (OptionId.startsWith(CTAIds[ConfigTopics.DutyActConfiguration].ArrestLogLocalChannel)) {
      if (ArrestReportsChannels.length) {
        const ExistingChannelIndex = ArrestReportsChannels.findIndex((C) => !C.includes(":"));
        if (ExistingChannelIndex === -1) {
          ArrestReportsChannels.push(SelectInteract.values[0]);
        } else if (SelectInteract.values[0]?.length) {
          ArrestReportsChannels[ExistingChannelIndex] = SelectInteract.values[0];
        } else {
          ArrestReportsChannels = ArrestReportsChannels.filter(
            (C) => C !== ArrestReportsChannels[ExistingChannelIndex]
          );
        }
      } else {
        ArrestReportsChannels = SelectInteract.values;
      }
    } else if (
      OptionId.startsWith(CTAIds[ConfigTopics.DutyActConfiguration].CitationLogLocalChannel)
    ) {
      if (CitationsLogChannels.length) {
        const ExistingChannelIndex = CitationsLogChannels.findIndex((C) => !C.includes(":"));
        if (ExistingChannelIndex === -1) {
          CitationsLogChannels.push(SelectInteract.values[0]);
        } else if (SelectInteract.values[0]?.length) {
          ArrestReportsChannels[ExistingChannelIndex] = SelectInteract.values[0];
        } else {
          ArrestReportsChannels = ArrestReportsChannels.filter(
            (C) => C !== ArrestReportsChannels[ExistingChannelIndex]
          );
        }
      } else {
        CitationsLogChannels = SelectInteract.values;
      }
    }
  };

  const HandleOutsideLogChannelSet = async (
    ButtonInteract: ButtonInteraction<"cached">,
    CurrentChannels: string[]
  ): Promise<string[]> => {
    const CCCopy = CurrentChannels.slice();
    const SetChannel = await HandleOutsideLogChannelBtnInteracts(ButtonInteract, CCCopy);
    if (SetChannel) {
      const ExistingChannelIndex = CurrentChannels.findIndex((C) => C.includes(":"));
      if (ExistingChannelIndex === -1) {
        CCCopy.push(SetChannel);
      } else {
        CCCopy[ExistingChannelIndex] = SetChannel;
      }
    } else {
      return CCCopy.filter((C) => !C.includes(":"));
    }
    return CCCopy;
  };

  const HandleButtonSelection = async (ButtonInteract: ButtonInteraction<"cached">) => {
    const BtnId = ButtonInteract.customId;

    if (BtnId.startsWith(CTAIds[ConfigTopics.DutyActConfiguration].OutsideArrestLogChannel)) {
      ArrestReportsChannels = await HandleOutsideLogChannelSet(
        ButtonInteract,
        ArrestReportsChannels
      );
    } else if (
      BtnId.startsWith(CTAIds[ConfigTopics.DutyActConfiguration].OutsideCitationLogChannel)
    ) {
      CitationsLogChannels = await HandleOutsideLogChannelSet(ButtonInteract, CitationsLogChannels);
    } else if (BtnId.startsWith(`${ConfigTopics.DutyActConfiguration}-cfm`)) {
      await HandleSaveConfirmation(ButtonInteract);
    } else if (BtnId.startsWith(`${ConfigTopics.DutyActConfiguration}-bck`)) {
      LCCompActionCollector.stop("Back");
      await ButtonInteract.deferUpdate();
      return Callback(CmdInteract);
    }
  };

  LCCompActionCollector.on("collect", async (RecInteract) => {
    try {
      if (RecInteract.isButton()) {
        await HandleButtonSelection(RecInteract);
      } else if (RecInteract.isChannelSelectMenu()) {
        await HandleChannelSelectMenuSettings(RecInteract);
        await RecInteract.deferUpdate();
      } else if (
        RecInteract.isStringSelectMenu() &&
        RecInteract.customId.startsWith(CTAIds[ConfigTopics.DutyActConfiguration].ModuleEnabled)
      ) {
        ModuleEnabled = RecInteract.values[0] === "true";
        await RecInteract.deferUpdate();
      }
    } catch (Err: any) {
      const ErrorId = GetErrorId();
      new ErrorEmbed()
        .useErrTemplate("AppError")
        .setErrorId(ErrorId)
        .replyToInteract(RecInteract, true);

      AppLogger.error({
        message: "Failed to handle component interactions for duty activities configuration;",
        error_id: ErrorId,
        label: FileLabel,
        stack: Err.stack,
      });
    }
  });

  LCCompActionCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.includes("time") || EndReason.includes("idle")) {
      const LastInteract = Collected.last() || CmdInteract;
      if (!(await ConfigPrompt.fetch(true).catch(() => null))) return;
      return new InfoEmbed()
        .useInfoTemplate("TimedOutConfigPrompt")
        .setTitle("Timed Out - Activities Module Configuration")
        .replyToInteract(LastInteract, false, true, "editReply");
    }
  });
}

async function HandleConfigShowPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  ConfigPrompt: Message<true> | InteractionResponse<true>
) {
  try {
    const ReceivedInteraction = await ConfigPrompt.awaitMessageComponent({
      filter: (Interact) => Interact.user.id === CmdInteract.user.id,
      componentType: ComponentType.Button,
      time: 10 * 60 * 1000,
    });

    if (ReceivedInteraction?.isButton() && ReceivedInteraction.customId.includes("bck")) {
      await ReceivedInteraction.deferUpdate();
      return Callback(CmdInteract);
    }
  } catch (Err: any) {
    if (Err.message.match(/reason: \w+Delete/)) return;
    if (Err.message?.match(/reason: (?:time|idle)/i)) {
      const MessageComponents = GetShowConfigurationsPageComponents(CmdInteract);
      MessageComponents.forEach((ActionRow) =>
        ActionRow.components.forEach((Comp) => Comp.setDisabled(true))
      );

      return CmdInteract.editReply({ components: MessageComponents }).catch(() => null);
    }
  }
}

async function HandleBasicConfigSelection(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  CmdInteract: SlashCommandInteraction<"cached">
) {
  const GuildConfig = await GetGuildSettings(SelectInteract.guildId);
  if (GuildConfig) {
    const ModulePageComps = GetBasicConfigComponents(SelectInteract, GuildConfig);
    const ExplanationEmbed = GetBasicConfigExplanationEmbed();
    const ConfirmBackBtns = GetConfigTopicConfirmAndBackBtns(
      SelectInteract,
      ConfigTopics.BasicConfiguration
    );

    const ConfigPrompt = await SelectInteract.update({
      components: [...ModulePageComps, ConfirmBackBtns],
      embeds: [ExplanationEmbed],
    });

    return HandleBasicConfigPageInteracts(CmdInteract, ConfigPrompt, GuildConfig);
  } else {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(SelectInteract, true);
  }
}

async function HandleAdditionalConfigSelection(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  CmdInteract: SlashCommandInteraction<"cached">
) {
  const GuildConfig = await GetGuildSettings(CmdInteract.guildId);
  if (GuildConfig) {
    const ModulePageComps = GetAdditionalConfigComponents(CmdInteract, GuildConfig);
    const ExplanationEmbed = GetAdditionalConfigExplanationEmbed();
    const ConfirmBackBtns = GetConfigTopicConfirmAndBackBtns(
      CmdInteract,
      ConfigTopics.AdditionalConfiguration
    );

    const ConfigPrompt = await SelectInteract.update({
      components: [...ModulePageComps, ConfirmBackBtns],
      embeds: [ExplanationEmbed],
    });

    return HandleAdditionalConfigPageInteracts(CmdInteract, ConfigPrompt, GuildConfig);
  } else {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(SelectInteract, true);
  }
}

async function HandleShiftModuleSelection(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  CmdInteract: SlashCommandInteraction<"cached">
) {
  const GuildConfig = await GetGuildSettings(CmdInteract.guildId);

  if (GuildConfig) {
    const ExplanationEmbed = GetShiftModuleConfigExplanationEmbed();
    const ModulePageComps = GetShiftModuleConfigComponents(
      CmdInteract,
      GuildConfig.shift_management
    );

    const ConfirmBackBtns = GetConfigTopicConfirmAndBackBtns(
      CmdInteract,
      ConfigTopics.ShiftConfiguration
    );

    const ConfigPrompt = await SelectInteract.update({
      components: [...ModulePageComps, ConfirmBackBtns],
      embeds: [ExplanationEmbed],
    });

    return HandleShiftConfigPageInteracts(CmdInteract, ConfigPrompt, GuildConfig.shift_management);
  } else {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(SelectInteract, true);
  }
}

async function HandleDutyActivitiesModuleSelection(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  CmdInteract: SlashCommandInteraction<"cached">
) {
  const GuildConfig = await GetGuildSettings(CmdInteract.guildId);

  if (GuildConfig) {
    const ExplanationEmbed = GetDutyActivitiesModuleConfigExplanationEmbed();
    const ModulePageComps = GetDutyActModuleConfigComponents(
      CmdInteract,
      GuildConfig.duty_activities
    );

    const ConfirmBackBtns = GetConfigTopicConfirmAndBackBtns(
      CmdInteract,
      ConfigTopics.DutyActConfiguration
    );

    const ConfigPrompt = await SelectInteract.update({
      components: [...ModulePageComps, ConfirmBackBtns],
      embeds: [ExplanationEmbed],
    });

    return HandleDutyActivitiesConfigPageInteracts(
      CmdInteract,
      ConfigPrompt,
      GuildConfig.duty_activities
    );
  } else {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(SelectInteract, true);
  }
}

async function HandleLeaveModuleSelection(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  CmdInteract: SlashCommandInteraction<"cached">
) {
  const GuildConfig = await GetGuildSettings(CmdInteract.guildId);

  if (GuildConfig) {
    const ExplanationEmbed = GetLeaveModuleConfigExplanationEmbed();
    const ModulePageComps = GetLeaveModuleConfigComponents(CmdInteract, GuildConfig.leave_notices);
    const ConfirmBackBtns = GetConfigTopicConfirmAndBackBtns(
      CmdInteract,
      ConfigTopics.LeaveConfiguration
    );

    const ConfigPrompt = await SelectInteract.update({
      components: [...ModulePageComps, ConfirmBackBtns],
      embeds: [ExplanationEmbed],
    });

    return HandleLeaveConfigPageInteracts(CmdInteract, ConfigPrompt, GuildConfig.duty_activities);
  } else {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(SelectInteract, true);
  }
}

async function HandleConfigShowSelection(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  CmdInteract: SlashCommandInteraction<"cached">
) {
  const GuildSettings = await GetGuildSettings(CmdInteract.guildId);
  if (!GuildSettings) {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(SelectInteract, true);
  }

  const PageComponents = GetShowConfigurationsPageComponents(CmdInteract);
  const StaffRoles = GuildSettings.role_perms.staff.map((Role) => roleMention(Role));
  const ManagementRoles = GuildSettings.role_perms.management.map((Role) => roleMention(Role));
  const BasicSettingsFieldText = Dedent(`
    >>> **Roblox Auth Required:** ${GuildSettings.require_authorization ? "Yes" : "No"}
    **Staff Roles:**
    ${StaffRoles.length ? ListFormatter.format(StaffRoles) : "None"}
    **Management Roles:**
    ${ManagementRoles.length ? ListFormatter.format(ManagementRoles) : "None"}
  `);

  const SMOnDutyRoles = GuildSettings.shift_management.role_assignment.on_duty.map((Role) =>
    roleMention(Role)
  );

  const SMOnBreakRoles = GuildSettings.shift_management.role_assignment.on_break.map((Role) =>
    roleMention(Role)
  );

  const ShiftLogChannel = GuildSettings.shift_management.log_channel
    ? channelMention(GuildSettings.shift_management.log_channel)
    : "None";

  const ShiftModuleFieldText = Dedent(`
    >>> **Module Enabled:** ${GuildSettings.shift_management.enabled ? "Yes" : "No"}
    **Shift Log Channel:** ${ShiftLogChannel}
    **Role Assignment:**
    - **On-Duty Role${SMOnDutyRoles.length > 1 ? "s" : ""}:** ${SMOnDutyRoles.length ? "\n" + ListFormatter.format(SMOnDutyRoles) : "None"}
    - **On-Break Role${SMOnDutyRoles.length > 1 ? "s" : ""}:** ${SMOnBreakRoles.length ? "\n" + ListFormatter.format(SMOnBreakRoles) : "None"}
  `);

  const IncidentLogChannel = GuildSettings.duty_activities.log_channels.incidents
    ? channelMention(GuildSettings.duty_activities.log_channels.incidents)
    : "None";

  const CitationLogChannels = GuildSettings.duty_activities.log_channels.citations.map(
    (CI) => `<#${CI.match(/:?(\d+)$/)?.[1]}>`
  );

  const ArrestLogChannels = GuildSettings.duty_activities.log_channels.arrests.map(
    (CI) => `<#${CI.match(/:?(\d+)$/)?.[1]}>`
  );

  const DutyActivitiesModuleFieldDesc = Dedent(`
    >>> **Module Enabled:** ${GuildSettings.duty_activities.enabled ? "Yes" : "No"}
    **Incident Log Channel:** ${IncidentLogChannel}
    **Citation Log Channel${CitationLogChannels.length > 1 ? "s" : ""}:** 
    ${CitationLogChannels.length ? ListFormatter.format(CitationLogChannels) : "*None*"}
    **Arrest Log Channel${ArrestLogChannels.length > 1 ? "s" : ""}:** 
    ${ArrestLogChannels.length ? ListFormatter.format(ArrestLogChannels) : "*None*"}
  `);

  const AdditionalConfigFieldDesc = Dedent(`
    >>> **Log Deletion Interval:** ${GetHumanReadableLogDeletionInterval(GuildSettings.duty_activities.log_deletion_interval)}
  `);

  const LeaveNoticesModuleFieldDesc = Dedent(`
    >>> **Module Enabled:** ${GuildSettings.leave_notices.enabled ? "Yes" : "No"}
    **On-Leave Role:** ${GuildSettings.leave_notices.leave_role ? roleMention(GuildSettings.leave_notices.leave_role) : "None"}
    **Requests Channel:** ${GuildSettings.leave_notices.requests_channel ? channelMention(GuildSettings.leave_notices.requests_channel) : "None"}
    **Leave Log Channel:** ${GuildSettings.leave_notices.log_channel ? channelMention(GuildSettings.leave_notices.log_channel) : "None"}
  `);

  const ResponseEmbed = new EmbedBuilder()
    .setTitle("Current App Configuration")
    .setFooter({ text: "Showing configuration as of" })
    .setTimestamp(SelectInteract.createdAt)
    .setColor(BaseEmbedColor)
    .setFields(
      {
        name: "**Basic Configuration**",
        value: BasicSettingsFieldText,
      },
      {
        name: "**Shift Management Module**",
        value: ShiftModuleFieldText,
      },
      {
        name: "**Leave Notices Module**",
        value: LeaveNoticesModuleFieldDesc,
      },
      {
        name: "**Duty Activities Module**",
        value: DutyActivitiesModuleFieldDesc,
      },
      {
        name: "**Additional Configuration**",
        value: AdditionalConfigFieldDesc,
      }
    );

  const ShowConfigPageMsg = await SelectInteract.update({
    embeds: [ResponseEmbed],
    components: PageComponents,
  });

  return HandleConfigShowPageInteracts(CmdInteract, ShowConfigPageMsg);
}

// ---------------------------------------------------------------------------------------
// Initial Handlers:
// -----------------
async function HandleInitialRespActions(
  CmdInteract: SlashCommandInteraction<"cached">,
  CmdRespMsg: Message<true> | InteractionResponse<true>,
  SMenuDisabler: () => Promise<any>
) {
  return CmdRespMsg.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  })
    .then(async function OnInitialRespCallback(TopicSelectInteract) {
      const SelectedConfigTopic = TopicSelectInteract.values[0];

      if (SelectedConfigTopic === ConfigTopics.BasicConfiguration) {
        return HandleBasicConfigSelection(TopicSelectInteract, CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.ShiftConfiguration) {
        return HandleShiftModuleSelection(TopicSelectInteract, CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.DutyActConfiguration) {
        return HandleDutyActivitiesModuleSelection(TopicSelectInteract, CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.ShowConfigurations) {
        return HandleConfigShowSelection(TopicSelectInteract, CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.LeaveConfiguration) {
        return HandleLeaveModuleSelection(TopicSelectInteract, CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.AdditionalConfiguration) {
        return HandleAdditionalConfigSelection(TopicSelectInteract, CmdInteract);
      } else {
        return new ErrorEmbed()
          .useErrTemplate("UnknownConfigTopic")
          .replyToInteract(TopicSelectInteract);
      }
    })
    .catch((Err) => HandleActionCollectorExceptions(Err, SMenuDisabler));
}

async function Callback(CmdInteract: SlashCommandInteraction<"cached">) {
  const CmdRespEmbed = new EmbedBuilder()
    .setColor(BaseEmbedColor)
    .setTitle("App Configuration")
    .setDescription("**Please select a module or a topic from the drop-down list below.**");

  const CTopicsMenu = GetConfigTopicsDropdownMenu(CmdInteract);
  const ReplyMethod = CmdInteract.replied || CmdInteract.deferred ? "editReply" : "reply";
  const CmdRespMsg = await CmdInteract[ReplyMethod]({
    components: [CTopicsMenu],
    embeds: [CmdRespEmbed],
  });

  const DisablePrompt = () => {
    CTopicsMenu.components[0].setDisabled(true);
    return CmdInteract.editReply({
      components: [CTopicsMenu],
    });
  };

  return HandleInitialRespActions(CmdInteract, CmdRespMsg, DisablePrompt);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  options: { user_perms: [PermissionFlagsBits.ManageGuild] },
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("View and manage the application configuration for this server.")
    .setContexts(InteractionContextType.Guild),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
