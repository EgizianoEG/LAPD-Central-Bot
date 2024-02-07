import {
  Message,
  ButtonStyle,
  ChannelType,
  roleMention,
  EmbedBuilder,
  ModalBuilder,
  ButtonBuilder,
  ComponentType,
  TextInputStyle,
  channelMention,
  ActionRowBuilder,
  TextInputBuilder,
  ButtonInteraction,
  InteractionResponse,
  SlashCommandBuilder,
  InteractionCollector,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalActionRowComponentBuilder,
  PermissionFlagsBits,
} from "discord.js";

import { ArraysAreEqual } from "@Utilities/Other/ArraysAreEqual.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleButtonCollectorExceptions.js";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";
import GuildModel from "@Models/Guild.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
const ListFormatter = new Intl.ListFormat("en");
const EmbedColor = "#5f9ea0";
enum ConfigTopics {
  ShowConfigurations = "SH",
  BasicConfiguration = "BC",
  ShiftConfiguration = "SC",
  LogConfiguration = "LC",
}

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
function GetConfigTopicConfirmBackBtns(
  CmdInteract: SlashCommandInteraction<"cached">,
  ConfigTopic: ConfigTopics
) {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setLabel("Confirm and Save")
      .setStyle(ButtonStyle.Success)
      .setCustomId(
        `app-config-${ConfigTopic.toLowerCase()}-cfm:${CmdInteract.user.id}:${CmdInteract.guildId}`
      ),
    new ButtonBuilder()
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(
        `app-config-${ConfigTopic.toLowerCase()}-bck:${CmdInteract.user.id}:${CmdInteract.guildId}`
      )
  );
}

function GetConfigTopicsDropdownMenu(CmdInteract: SlashCommandInteraction<"cached">) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`app-config:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("Select a configuration topic.")
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Basic Configuration")
          .setDescription("The app's basic settings like staff and management roles.")
          .setValue(ConfigTopics.BasicConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Shift Configuration")
          .setDescription("The app's shift management settings; on-break and on-duty roles.")
          .setValue(ConfigTopics.ShiftConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Log Configuration")
          .setDescription("The app's log settings.")
          .setValue(ConfigTopics.LogConfiguration),
        new StringSelectMenuOptionBuilder()
          .setLabel("Show All Configurations")
          .setDescription("Shows the app's current configuration for all available topics.")
          .setValue(ConfigTopics.ShowConfigurations)
      )
  );
}

function GetBasicConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached">,
  GuildConfig: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  const RobloxAuthorizationAR = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`app-config-bc-rra:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("Roblox Authorization Required")
      .setDisabled(true)
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Enabled")
          .setValue("true")
          .setDescription("Enable Roblox account linking requirement.")
          .setDefault(!!GuildConfig.require_authorization),
        new StringSelectMenuOptionBuilder()
          .setLabel("Disabled")
          .setValue("false")
          .setDescription("Disable Roblox linking requirement.")
          .setDefault(!GuildConfig.require_authorization)
      )
  );

  const StaffRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`app-config-bc-sr:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("Staff Roles")
      .setMinValues(0)
      .setMaxValues(8)
      .setDefaultRoles(GuildConfig.role_perms.staff)
  );

  const ManagementRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`app-config-bc-mr:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("Management Roles")
      .setMinValues(0)
      .setMaxValues(8)
      .setDefaultRoles(GuildConfig.role_perms.management)
  );

  return [RobloxAuthorizationAR, StaffRolesAR, ManagementRolesAR] as const;
}

function GetShiftConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached">,
  GuildConfig: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  const OnDutyRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`app-config-sc-or:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("On-Duty Role(s)")
      .setMinValues(0)
      .setMaxValues(3)
      .setDefaultRoles(GuildConfig.shifts.role_assignment.on_duty)
  );

  const OnBreakRolesAR = new ActionRowBuilder<RoleSelectMenuBuilder>().setComponents(
    new RoleSelectMenuBuilder()
      .setCustomId(`app-config-sc-br:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("On-Duty Role(s)")
      .setMinValues(0)
      .setMaxValues(3)
      .setDefaultRoles(GuildConfig.shifts.role_assignment.on_break)
  );

  return [OnDutyRolesAR, OnBreakRolesAR] as const;
}

function GetLogConfigComponents(
  CmdInteract: SlashCommandInteraction<"cached">,
  GuildConfig: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  const SALogChannel = GuildConfig.log_channels.shift_activities || undefined;
  const LArrestsLogChannel = GuildConfig.log_channels.arrests.find((C) => !C.includes(":"));
  const LCitationLogChannel = GuildConfig.log_channels.citations.find((C) => !C.includes(":"));

  const ShiftActivitiesLogChannel = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setCustomId(`app-config-lc-sa:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("Local Channel for Logging Shift Activities")
      .setMinValues(0)
      .setMaxValues(1)
  );

  const LocalGuildCitsLogChannel = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    new ChannelSelectMenuBuilder()
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setCustomId(`app-config-lc-cc:${CmdInteract.user.id}:${CmdInteract.guildId}`)
      .setPlaceholder("Local Channel for Logging Citations")
      .setMinValues(0)
      .setMaxValues(1)
  );

  const LocalGuildArrestsLogChannel =
    new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
      new ChannelSelectMenuBuilder()
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setCustomId(`app-config-lc-ac:${CmdInteract.user.id}:${CmdInteract.guildId}`)
        .setPlaceholder("Local Channel for Arrest Reports")
        .setMinValues(0)
        .setMaxValues(1)
    );

  const SetOutsideLogChannelBtns = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId(`app-config-lc-oac:${CmdInteract.user}`)
      .setLabel("Set Outside Arrest Logs Channel")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`app-config-lc-occ:${CmdInteract.user}`)
      .setLabel("Set Outside Citation Logs Channel")
      .setStyle(ButtonStyle.Primary)
  );

  if (SALogChannel) ShiftActivitiesLogChannel.components[0].setDefaultChannels(SALogChannel);
  if (LCitationLogChannel)
    LocalGuildCitsLogChannel.components[0].setDefaultChannels(LCitationLogChannel);
  if (LArrestsLogChannel)
    LocalGuildArrestsLogChannel.components[0].setDefaultChannels(LArrestsLogChannel);

  return [
    ShiftActivitiesLogChannel,
    LocalGuildCitsLogChannel,
    LocalGuildArrestsLogChannel,
    SetOutsideLogChannelBtns,
  ] as const;
}

async function HandleOutsideLogChannelBtnInteracts(
  BtnInteract: ButtonInteraction<"cached">,
  CurrentLogChannels: string[]
): Promise<null | undefined | string> {
  const CurrLogChannel = CurrentLogChannels.find((C) => C.includes(":"));
  const LogChannelTopic = BtnInteract.customId.startsWith("app-config-lc-oac")
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
          .setCustomId(BtnInteract.customId + "-")
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
    await ModalSubmission.deferUpdate().catch(() => null);
    const TypedChannel = ModalSubmission.fields
      .getTextInputValue(BtnInteract.customId + "-")
      .trim();

    if (!TypedChannel) return null;
    if (TypedChannel.match(/^\d{15,22}:\d{15,22}$/)) {
      if (TypedChannel === CurrLogChannel) return CurrLogChannel;

      const [GuildId, ChannelId] = TypedChannel.split(":");
      const GuildFound = await ModalSubmission.client.guilds.fetch(GuildId).catch(() => null);
      const ChannelFound = await GuildFound?.channels.fetch(ChannelId).catch(() => null);

      if (!GuildFound) {
        new ErrorEmbed()
          .useErrTemplate("DiscordGuildNotFound", GuildId)
          .replyToInteract(ModalSubmission, true, true, "reply");
        return CurrLogChannel;
      } else if (!ChannelFound) {
        new ErrorEmbed()
          .useErrTemplate("DiscordChannelNotFound", ChannelId)
          .replyToInteract(ModalSubmission, true, true, "reply");
        return CurrLogChannel;
      } else {
        const GuildMember = await GuildFound.members.fetch(ModalSubmission.user).catch(() => null);
        if (!GuildMember) {
          new ErrorEmbed()
            .useErrTemplate("NotJoinedInGuild")
            .replyToInteract(ModalSubmission, true, true, "reply");
          return CurrLogChannel;
        } else if (!GuildMember.permissions.has(PermissionFlagsBits.Administrator)) {
          new ErrorEmbed()
            .useErrTemplate("InsufficientAdminPerms")
            .replyToInteract(ModalSubmission, true, true, "reply");
          return CurrLogChannel;
        }
      }

      return TypedChannel;
    } else {
      new ErrorEmbed()
        .useErrTemplate("InvalidGuildChannelFormat")
        .replyToInteract(ModalSubmission, true, true, "reply");

      return CurrLogChannel;
    }
  } else {
    return CurrLogChannel;
  }
}

async function HandleConfirmBackBtnsInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  BtnInteract: ButtonInteraction<"cached">,
  ActionCollector: InteractionCollector<any>
) {
  if (BtnInteract.customId.match(/^app-config-\w+-cfm/)) {
    ActionCollector.stop("ConfirmConfig");
  } else if (BtnInteract.customId.match(/^app-config-\w+-bck/)) {
    ActionCollector.stop("Back");
    return Callback(CmdInteract.client, CmdInteract) as any;
  } else {
    return ActionCollector.stop("UnknownBtn");
  }
}

async function HandleBasicConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  BCConfigPrompt: Message<true>,
  BasicConfigComps: ReturnType<typeof GetBasicConfigComponents>,
  CurrentConfiguration: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  let StaffRoles: string[] = CurrentConfiguration.role_perms.staff.slice();
  let ManagementRoles: string[] = CurrentConfiguration.role_perms.management.slice();
  let RobloxAuthorizationRequired: boolean = CurrentConfiguration.require_authorization;

  const BCCompActionCollector = BCConfigPrompt.createMessageComponentCollector<
    ComponentType.Button | ComponentType.RoleSelect | ComponentType.StringSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const PromptDisabler = () => {
    BasicConfigComps.forEach((AR) => AR.components.forEach((C) => C.setDisabled(true)));
    return CmdInteract.editReply({
      components: [...BasicConfigComps],
    });
  };

  BCCompActionCollector.on("collect", async (Interact) => {
    await Interact.deferUpdate();
    if (Interact.isButton()) {
      if (Interact.customId.startsWith("app-config-bc-cfm")) {
        BCCompActionCollector.stop("ConfirmConfig");
      } else if (Interact.customId.startsWith("app-config-bc-bck")) {
        BCCompActionCollector.stop("Back");
        return Callback(CmdInteract.client, CmdInteract) as any;
      }
    } else if (Interact.isRoleSelectMenu()) {
      if (Interact.customId.startsWith("app-config-bc-sr")) {
        StaffRoles = Interact.values;
      } else if (Interact.customId.startsWith("app-config-bc-mr")) {
        ManagementRoles = Interact.values;
      }
    } else {
      RobloxAuthorizationRequired = Interact.values[0] === "true";
    }
  });

  BCCompActionCollector.on("end", async (_, EndReason) => {
    BCCompActionCollector.removeAllListeners();
    if (EndReason.match(/\w+Delete/)) return;
    if (EndReason !== "ConfirmConfig") {
      if (EndReason.includes("time")) {
        await new InfoEmbed()
          .useInfoTemplate("TimedOutConfigPrompt")
          .setTitle("Timed Out - Basic Configuration")
          .replyToInteract(CmdInteract)
          .catch(() => PromptDisabler())
          .catch(() => null);
      } else {
        await PromptDisabler();
      }
      return;
    }

    if (
      CurrentConfiguration.require_authorization === RobloxAuthorizationRequired &&
      ArraysAreEqual(CurrentConfiguration.role_perms.staff, StaffRoles) &&
      ArraysAreEqual(CurrentConfiguration.role_perms.management, ManagementRoles)
    ) {
      await new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "basic")
        .replyToInteract(CmdInteract)
        .catch(() => PromptDisabler())
        .catch(() => null);
      return;
    }

    const UpdatedGuild = await GuildModel.findByIdAndUpdate(
      CmdInteract.guildId,
      {
        $set: {
          "settings.require_authorization": RobloxAuthorizationRequired,
          "settings.role_perms.staff": StaffRoles,
          "settings.role_perms.management": ManagementRoles,
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
    );

    if (UpdatedGuild) {
      const StaffSetRoles = UpdatedGuild.settings.role_perms.staff.map((R) => `<@&${R}>`);
      const MgmtSetRoles = UpdatedGuild.settings.role_perms.management.map((R) => `<@&${R}>`);
      const FormattedDesc = Dedent(`
        Successfully set/updated the app's basic configuration.
        - **Roblox Authorization Required:** ${RobloxAuthorizationRequired ? "Yes" : "No"}
        - **Staff Role(s):**
          > ${StaffSetRoles.length ? ListFormatter.format(StaffSetRoles) : "*None*"}
        - **Management Role(s):**
          > ${MgmtSetRoles.length ? ListFormatter.format(MgmtSetRoles) : "*None*"}
      `);

      await new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(CmdInteract);
    } else {
      await new ErrorEmbed().useErrTemplate("UnknownError").replyToInteract(CmdInteract);
    }
  });
}

async function HandleShiftConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  BCConfigPrompt: Message<true>,
  ShiftConfigComps: [
    ...ReturnType<typeof GetShiftConfigComponents>,
    ReturnType<typeof GetConfigTopicConfirmBackBtns>,
  ],
  CurrentConfiguration: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  let OnDutyRoles: string[] = CurrentConfiguration.shifts.role_assignment.on_duty.slice();
  let OnBreakRoles: string[] = CurrentConfiguration.shifts.role_assignment.on_break.slice();

  const SCCompActionCollector = BCConfigPrompt.createMessageComponentCollector<
    ComponentType.Button | ComponentType.RoleSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const PromptDisabler = () => {
    ShiftConfigComps.forEach((AR) => AR.components.forEach((C) => C.setDisabled(true)));
    return CmdInteract.editReply({
      components: [...ShiftConfigComps],
    });
  };

  SCCompActionCollector.on("collect", async (Interact) => {
    await Interact.deferUpdate();
    if (Interact.isButton()) {
      await HandleConfirmBackBtnsInteracts(CmdInteract, Interact, SCCompActionCollector);
    } else if (Interact.customId.startsWith("app-config-sc-or")) {
      OnDutyRoles = Interact.values;
    } else if (Interact.customId.startsWith("app-config-sc-br")) {
      OnBreakRoles = Interact.values;
    }
  });

  SCCompActionCollector.on("end", async (_, EndReason) => {
    SCCompActionCollector.removeAllListeners();
    if (EndReason.match(/\w+Delete/)) return;
    if (EndReason !== "ConfirmConfig") {
      if (EndReason.includes("time")) {
        await new InfoEmbed()
          .useInfoTemplate("TimedOutConfigPrompt")
          .setTitle("Timed Out - Shift Configuration")
          .replyToInteract(CmdInteract)
          .catch(() => PromptDisabler())
          .catch(() => null);
      } else {
        await PromptDisabler();
      }
      return;
    }

    if (
      ArraysAreEqual(CurrentConfiguration.shifts.role_assignment.on_duty, OnDutyRoles) &&
      ArraysAreEqual(CurrentConfiguration.shifts.role_assignment.on_break, OnBreakRoles)
    ) {
      await new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "shifts")
        .replyToInteract(CmdInteract)
        .catch(() => PromptDisabler())
        .catch(() => null);
      return;
    }

    const UpdatedGuild = await GuildModel.findByIdAndUpdate(
      CmdInteract.guildId,
      {
        $set: {
          "settings.shifts.role_assignment.on_duty": OnDutyRoles,
          "settings.shifts.role_assignment.on_break": OnBreakRoles,
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
    );

    if (UpdatedGuild) {
      const OnDutySetRoles = UpdatedGuild.settings.shifts.role_assignment.on_duty.map(
        (R) => `<@&${R}>`
      );

      const OnBreakSetRoles = UpdatedGuild.settings.shifts.role_assignment.on_break.map(
        (R) => `<@&${R}>`
      );

      const FormattedDesc = Dedent(`
        Successfully set/updated the app's shifts configuration.
        - **On-Duty Role(s):**
          > ${OnDutySetRoles.length ? ListFormatter.format(OnDutySetRoles) : "*None*"}
        - **On-Break Role(s):**
          > ${OnBreakSetRoles.length ? ListFormatter.format(OnBreakSetRoles) : "*None*"}
      `);

      await new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(CmdInteract);
    } else {
      await new ErrorEmbed().useErrTemplate("UnknownError").replyToInteract(CmdInteract);
    }
  });
}

async function HandleLogConfigPageInteracts(
  CmdInteract: SlashCommandInteraction<"cached">,
  BCConfigPrompt: Message<true>,
  LogConfigComps: [
    ...ReturnType<typeof GetLogConfigComponents>,
    ReturnType<typeof GetConfigTopicConfirmBackBtns>,
  ],
  CurrentConfiguration: NonNullable<Awaited<ReturnType<typeof GetGuildSettings>>>
) {
  let ShiftActivitiesLogChannel = CurrentConfiguration.log_channels.shift_activities;
  let ArrestReportsChannels = CurrentConfiguration.log_channels.arrests.slice();
  let CitationLogsChannels = CurrentConfiguration.log_channels.citations.slice();

  const LCCompActionCollector = BCConfigPrompt.createMessageComponentCollector<
    ComponentType.Button | ComponentType.ChannelSelect
  >({
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 10 * 60 * 1000,
  });

  const PromptDisabler = () => {
    LogConfigComps.forEach((AR) => AR.components.forEach((C) => C.setDisabled(true)));
    return CmdInteract.editReply({
      components: [...LogConfigComps],
    });
  };

  LCCompActionCollector.on("collect", async (Interact) => {
    if (!Interact.isButton()) await Interact.deferUpdate();
    if (Interact.isButton()) {
      if (Interact.customId.startsWith("app-config-lc-oac")) {
        const SetChannel = await HandleOutsideLogChannelBtnInteracts(
          Interact,
          ArrestReportsChannels
        );

        if (SetChannel) {
          const ExistingChannelIndex = ArrestReportsChannels.findIndex((C) => C.includes(":"));
          if (ExistingChannelIndex === -1) {
            ArrestReportsChannels.push(SetChannel);
          } else {
            ArrestReportsChannels[ExistingChannelIndex] = SetChannel;
          }
        } else {
          ArrestReportsChannels = ArrestReportsChannels.filter((C) => !C.includes(":"));
        }
      } else if (Interact.customId.startsWith("app-config-lc-occ")) {
        const SetChannel = await HandleOutsideLogChannelBtnInteracts(
          Interact,
          CitationLogsChannels
        );

        if (SetChannel) {
          const ExistingChannelIndex = CitationLogsChannels.findIndex((C) => C.includes(":"));
          if (ExistingChannelIndex === -1) {
            CitationLogsChannels.push(SetChannel);
          } else {
            CitationLogsChannels[ExistingChannelIndex] = SetChannel;
          }
        } else {
          CitationLogsChannels = CitationLogsChannels.filter((C) => !C.includes(":"));
        }
      } else {
        await HandleConfirmBackBtnsInteracts(CmdInteract, Interact, LCCompActionCollector);
      }
    } else if (Interact.customId.startsWith("app-config-lc-sa")) {
      ShiftActivitiesLogChannel = Interact.values[0];
    } else if (Interact.customId.startsWith("app-config-lc-ac")) {
      if (ArrestReportsChannels.length) {
        const ExistingChannelIndex = ArrestReportsChannels.findIndex((C) => !C.includes(":"));
        if (ExistingChannelIndex === -1) {
          ArrestReportsChannels.push(Interact.values[0]);
        } else if (Interact.values[0]?.length) {
          ArrestReportsChannels[ExistingChannelIndex] = Interact.values[0];
        } else {
          ArrestReportsChannels = ArrestReportsChannels.filter(
            (C) => C !== ArrestReportsChannels[ExistingChannelIndex]
          );
        }
      } else {
        ArrestReportsChannels = Interact.values;
      }
    } else if (Interact.customId.startsWith("app-config-lc-cc")) {
      if (CitationLogsChannels.length) {
        const ExistingChannelIndex = CitationLogsChannels.findIndex((C) => !C.includes(":"));
        if (ExistingChannelIndex === -1) {
          CitationLogsChannels.push(Interact.values[0]);
        } else if (Interact.values[0]?.length) {
          ArrestReportsChannels[ExistingChannelIndex] = Interact.values[0];
        } else {
          ArrestReportsChannels = ArrestReportsChannels.filter(
            (C) => C !== ArrestReportsChannels[ExistingChannelIndex]
          );
        }
      } else {
        CitationLogsChannels = Interact.values;
      }
    }
  });

  LCCompActionCollector.on("end", async (_, EndReason) => {
    LCCompActionCollector.removeAllListeners();
    if (EndReason.match(/\w+Delete/)) return;
    if (EndReason !== "ConfirmConfig") {
      if (EndReason.includes("time")) {
        await new InfoEmbed()
          .useInfoTemplate("TimedOutConfigPrompt")
          .setTitle("Timed Out - Logging Configuration")
          .replyToInteract(CmdInteract)
          .catch(() => PromptDisabler())
          .catch(() => null);
      } else {
        await PromptDisabler();
      }
      return;
    }

    if (
      CurrentConfiguration.log_channels.shift_activities === ShiftActivitiesLogChannel &&
      ArraysAreEqual(CurrentConfiguration.log_channels.arrests, ArrestReportsChannels) &&
      ArraysAreEqual(CurrentConfiguration.log_channels.citations, CitationLogsChannels)
    ) {
      await new InfoEmbed()
        .useInfoTemplate("ConfigTopicNoChangesMade", "logging")
        .replyToInteract(CmdInteract)
        .catch(() => PromptDisabler())
        .catch(() => null);
      return;
    }

    const UpdatedGuild = await GuildModel.findByIdAndUpdate(
      CmdInteract.guildId,
      {
        $set: {
          "settings.log_channels.arrests": ArrestReportsChannels,
          "settings.log_channels.citations": CitationLogsChannels,
          "settings.log_channels.shift_activities": ShiftActivitiesLogChannel,
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
    );

    if (UpdatedGuild) {
      const SASetChannel = UpdatedGuild.settings.log_channels.shift_activities
        ? `<#${UpdatedGuild.settings.log_channels.shift_activities}>`
        : "*None*";

      const ARSetChannels = UpdatedGuild.settings.log_channels.arrests.map(
        (CI) => `<#${CI.match(/:?(\d+)$/)?.[1]}>`
      );

      const CLSetChannels = UpdatedGuild.settings.log_channels.citations.map(
        (CI) => `<#${CI.match(/:?(\d+)$/)?.[1]}>`
      );

      const FormattedDesc = Dedent(`
        Successfully set/updated the app's logging configuration.
        - **Shift Activities Channel:** ${SASetChannel}
        - **Arrest Reports Log Channels:**
          > ${ARSetChannels.length ? ListFormatter.format(ARSetChannels) : "*None*"}
        - **Citation Issued Log Channels:**
          > ${CLSetChannels.length ? ListFormatter.format(CLSetChannels) : "*None*"}
      `);

      await new SuccessEmbed().setDescription(FormattedDesc).replyToInteract(CmdInteract);
    } else {
      await new ErrorEmbed().useErrTemplate("UnknownError").replyToInteract(CmdInteract);
    }
  });
}

async function HandleBasicConfigSelection(CmdInteract: SlashCommandInteraction<"cached">) {
  const GuildConfig = await GetGuildSettings(CmdInteract.guildId);
  const ResponseEmbed = new EmbedBuilder()
    .setTitle("App Basic Configuration")
    .setColor(EmbedColor)
    .setDescription(
      Dedent(`
        1. **Roblox Authorization Required:**
          Enable or disable the app's Roblox authorization requirement. If enabled, \
          the app requires the user to have a Roblox account linked before utilizing \
          specific staff commands such as \`log\` and \`duty\` commands. This option is currently enabled by default.
        2. **Staff Roles:**
          The roles for which holders will be considered staff members and will be able to execute staff-specific commands.
        3. **Management Roles:**
          The roles for which holders will be able to execute management-specific commands, such as \`duty admin\`, as well as staff-specific commands.
      `)
    );

  if (GuildConfig) {
    const BasicConfigComps = GetBasicConfigComponents(CmdInteract, GuildConfig);
    const ConfirmBackBtns = GetConfigTopicConfirmBackBtns(
      CmdInteract,
      ConfigTopics.BasicConfiguration
    );
    const BasicConfigRespMsg = await CmdInteract.editReply({
      components: [...BasicConfigComps, ConfirmBackBtns],
      embeds: [ResponseEmbed],
    });

    return HandleBasicConfigPageInteracts(
      CmdInteract,
      BasicConfigRespMsg,
      BasicConfigComps,
      GuildConfig
    );
  } else {
    return new ErrorEmbed().useErrTemplate("GuildConfigNotFound").replyToInteract(CmdInteract);
  }
}

async function HandleShiftConfigSelection(CmdInteract: SlashCommandInteraction<"cached">) {
  const GuildConfig = await GetGuildSettings(CmdInteract.guildId);
  const ResponseEmbed = new EmbedBuilder()
    .setTitle("Shifts Configuration")
    .setColor(EmbedColor)
    .setDescription(
      Dedent(`
        1. **Role Assignment:**
          - **On-Duty:**
            The role(s) that will be assigned to staff members while being on duty.
          - **On-Break:**
            The role(s) that will be assigned to staff members while being on break.
     `)
    );

  if (GuildConfig) {
    const ShiftsConfigComps = GetShiftConfigComponents(CmdInteract, GuildConfig);
    const ConfirmBackBtns = GetConfigTopicConfirmBackBtns(
      CmdInteract,
      ConfigTopics.ShiftConfiguration
    );

    const BasicConfigRespMsg = await CmdInteract.editReply({
      components: [...ShiftsConfigComps, ConfirmBackBtns],
      embeds: [ResponseEmbed],
    });

    return HandleShiftConfigPageInteracts(
      CmdInteract,
      BasicConfigRespMsg,
      [...ShiftsConfigComps, ConfirmBackBtns],
      GuildConfig
    );
  } else {
    return new ErrorEmbed().useErrTemplate("GuildConfigNotFound").replyToInteract(CmdInteract);
  }
}

async function HandleLogConfigSelection(CmdInteract: SlashCommandInteraction<"cached">) {
  const GuildConfig = await GetGuildSettings(CmdInteract.guildId);
  const ResponseEmbed = new EmbedBuilder()
    .setTitle("Logging Configuration")
    .setColor(EmbedColor)
    .setDescription(
      Dedent(`
        1. **Shift Activities Channel:**
          The channel that will be used to log any shift activity or action made by staff such as \`start\`, \`end\`, \`break-start\`, and \`break-end\`.
        2. **Citation Logs Channel:**
          The local channel (inside this server) that will be used to log any citations issued by staff members.
        3. **Arrest Logs Channel:**
          The local channel (inside this server) that will be used to log any arrests reported by staff members.
        4. **Outside Server Connections Buttons:**
          - **Set Outside Citation Logs Channel:**
            A button to add an outside citation logs channel (other server's channel) to be also used alongside the local set one.
          - **Set Outside Arrest Logs Channel:**
            A button to add an outside arrest logs channel (other server's channel) to be also used alongside the local set one.
     `)
    );

  if (GuildConfig) {
    const LogConfigComps = GetLogConfigComponents(CmdInteract, GuildConfig);
    const ConfirmBackBtns = GetConfigTopicConfirmBackBtns(
      CmdInteract,
      ConfigTopics.ShiftConfiguration
    );

    const BasicConfigRespMsg = await CmdInteract.editReply({
      components: [...LogConfigComps, ConfirmBackBtns],
      embeds: [ResponseEmbed],
    });

    return HandleLogConfigPageInteracts(
      CmdInteract,
      BasicConfigRespMsg,
      [...LogConfigComps, ConfirmBackBtns],
      GuildConfig
    );
  } else {
    return new ErrorEmbed().useErrTemplate("GuildConfigNotFound").replyToInteract(CmdInteract);
  }
}

async function HandleConfigShowSelection(CmdInteract: SlashCommandInteraction<"cached">) {
  const GuildSettings = await GetGuildSettings(CmdInteract.guildId);
  if (!GuildSettings) {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(CmdInteract, true, true);
  }

  const StaffRoles = GuildSettings.role_perms.staff.map((Role) => roleMention(Role));
  const ManagementRoles = GuildSettings.role_perms.management.map((Role) => roleMention(Role));
  const BasicConfigFieldDesc = Dedent(`
    - **Roblox Authorization Required:** ${GuildSettings.require_authorization ? "Yes" : "No"}
    - **Staff Roles:**
      > ${StaffRoles.length ? ListFormatter.format(StaffRoles) : "*None*"}
    - **Management Roles:**
      > ${ManagementRoles.length ? ListFormatter.format(ManagementRoles) : "*None*"}
  `);

  const OnDutyRoles = GuildSettings.shifts.role_assignment.on_duty.map((Role) => roleMention(Role));
  const OnBreakRoles = GuildSettings.shifts.role_assignment.on_break.map((Role) =>
    roleMention(Role)
  );
  const ShiftConfigFieldDesc = Dedent(`
    **Role Assignment:**
    - **On-Duty Roles:**
      > ${OnDutyRoles.length ? ListFormatter.format(OnDutyRoles) : "*None*"}
    - **On-Break Roles:**
      > ${OnBreakRoles.length ? ListFormatter.format(OnBreakRoles) : "*None*"}
  `);

  const ShiftActivitiesChannel = GuildSettings.log_channels.shift_activities
    ? channelMention(GuildSettings.log_channels.shift_activities)
    : "*None*";
  const CitationLogChannels = GuildSettings.log_channels.citations.map(
    (CI) => `<#${CI.match(/:?(\d+)$/)?.[1]}>`
  );
  const ArrestLogChannels = GuildSettings.log_channels.arrests.map(
    (CI) => `<#${CI.match(/:?(\d+)$/)?.[1]}>`
  );

  const LoggingConfigFieldDesc = Dedent(`
    - **Shift Activities Channel:** 
      ${ShiftActivitiesChannel}
    - **Citation Log Channels:** 
      ${CitationLogChannels.length ? ListFormatter.format(CitationLogChannels) : "*None*"}
    - **Arrest Log Channels:** 
      ${ArrestLogChannels.length ? ListFormatter.format(ArrestLogChannels) : "*None*"}
  `);

  const ResponseEmbed = new EmbedBuilder()
    .setTitle("Current App Configuration")
    .setColor(EmbedColor)
    .setTimestamp()
    .setFields(
      {
        name: "**Basic Configuration**",
        value: BasicConfigFieldDesc,
      },
      {
        name: "**Shift Configuration**",
        value: ShiftConfigFieldDesc,
      },
      {
        name: "**Logging Configuration**",
        value: LoggingConfigFieldDesc,
      }
    );

  return CmdInteract.editReply({
    embeds: [ResponseEmbed],
    components: [],
  });
}

async function HandleInitialRespActions(
  CmdInteract: SlashCommandInteraction<"cached">,
  CmdRespMsg: Message<true> | InteractionResponse<true>,
  SMenuDisabler: () => Promise<any>
) {
  return CmdRespMsg.awaitMessageComponent({
    componentType: ComponentType.StringSelect,
    filter: (Interact) => Interact.user.id === CmdInteract.user.id,
    time: 12.5 * 60 * 1000,
  })
    .then(async function OnInitialRespCallback(TopicSelectInteract) {
      const SelectedConfigTopic = TopicSelectInteract.values[0];
      await TopicSelectInteract.deferUpdate();

      if (SelectedConfigTopic === ConfigTopics.BasicConfiguration) {
        return HandleBasicConfigSelection(CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.ShiftConfiguration) {
        return HandleShiftConfigSelection(CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.LogConfiguration) {
        return HandleLogConfigSelection(CmdInteract);
      } else if (SelectedConfigTopic === ConfigTopics.ShowConfigurations) {
        return HandleConfigShowSelection(CmdInteract);
      } else {
        return new ErrorEmbed()
          .useErrTemplate("UnknownConfigTopic")
          .replyToInteract(TopicSelectInteract);
      }
    })
    .catch((Err) => HandleActionCollectorExceptions(Err, SMenuDisabler));
}

/**
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, CmdInteract: SlashCommandInteraction<"cached">) {
  const CmdRespEmbed = new EmbedBuilder()
    .setColor(EmbedColor)
    .setTitle("App Configuration")
    .setDescription("Please select a topic from the dropdown list below.");

  const CTopicsMenu = GetConfigTopicsDropdownMenu(CmdInteract);
  const ReplyMethod = CmdInteract.replied ? "editReply" : "reply";
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
  options: { userPerms: [PermissionFlagsBits.Administrator] },
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Manage and view bot configuration on the server.")
    .setDMPermission(false),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
