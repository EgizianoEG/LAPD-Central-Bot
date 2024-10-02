// Dependencies, Types, and Constants:
// -----------------------------------
import {
  MessageContextMenuCommandInteraction,
  StringSelectMenuInteraction,
  ContextMenuCommandBuilder,
  StringSelectMenuBuilder,
  ApplicationCommandType,
  InteractionContextType,
  ModalSubmitInteraction,
  InteractionCollector,
  CollectedInteraction,
  ButtonInteraction,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  ButtonBuilder,
  EmbedBuilder,
  ModalBuilder,
  ButtonStyle,
  Message,
  Colors,
} from "discord.js";

import {
  InfoEmbed,
  ErrorEmbed,
  SuccessEmbed,
  UnauthorizedEmbed,
} from "@Utilities/Classes/ExtraEmbeds.js";

import {
  IncidentNotesLength,
  IncidentStatusesWithDescriptions,
} from "@Resources/IncidentConstants.js";

import { GuildIncidents } from "@Typings/Utilities/Database.js";
import { ArraysAreEqual } from "@Utilities/Other/ArraysAreEqual.js";
import { FilterUserInput } from "@Utilities/Strings/Redactor.js";
import { SanitizeDiscordAttachmentLink } from "@Utilities/Strings/OtherUtils.js";

import Dedent from "dedent";
import IsEqual from "lodash/isEqual.js";
import GuildModel from "@Models/Guild.js";
import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";
import GetIncidentRecord from "@Utilities/Database/GetIncidentRecord.js";
import GetIncidentReportEmbeds from "@Utilities/Other/GetIncidentReportEmbeds.js";

const ListFormatter = new Intl.ListFormat("en");
const CompCollectorTimeout = 12.5 * 60 * 1000;
const SplitRegexForInputs = /\s*,\s*|\s+/;

type ValidationResult = {
  handled: boolean;
  incident: GuildIncidents.IncidentRecord | null;
};

enum IncidentEditOptionIds {
  Notes = "incident-edit-notes",
  Status = "incident-edit-status",
  Suspects = "incident-edit-suspects",
  Witnesses = "incident-edit-witnesses",
  SaveCancel = "incident-save-cancel",
  SaveConfirm = "incident-save-confirm",
}

enum ModalInputIds {
  Witnesses = "incident-witnesses-input",
  Suspects = "incident-suspects-input",
  Notes = "incident-notes-input",
}

// ---------------------------------------------------------------------------------------
// Component & Utility Helpers:
// ----------------------------
function GetIncidentEditOptionsMenu() {
  return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId("incident-edit-select")
      .setPlaceholder("Select an option...")
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions([
        {
          label: "Update Status",
          value: IncidentEditOptionIds.Status,
          description: "Change the incident status.",
        },
        {
          label: "Set Suspects",
          value: IncidentEditOptionIds.Suspects,
          description: "Add or remove incident suspects.",
        },
        {
          label: "Set Witnesses",
          value: IncidentEditOptionIds.Witnesses,
          description: "Add or remove incident witnesses.",
        },
        {
          label: "Set Notes",
          value: IncidentEditOptionIds.Notes,
          description: "Add or update incident notes.",
        },
      ])
  );
}

function GetSaveConfirmationButtons() {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId(IncidentEditOptionIds.SaveConfirm)
      .setLabel("Confirm and Update")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(IncidentEditOptionIds.SaveCancel)
      .setLabel("Cancel Modifications")
      .setStyle(ButtonStyle.Danger)
  );
}

function GetChangeIncidentStatusSelectMenuAR(CurrentStatus: string) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId("incident-status-input")
      .setPlaceholder("Set new status...")
      .setMinValues(0)
      .setMaxValues(1)
      .setOptions(
        IncidentStatusesWithDescriptions.map((Status) => ({
          label: Status.status,
          value: Status.status,
          default: CurrentStatus === Status.status,
          description: Status.description,
        }))
      )
  );
}

function GetChangeIncidentWitnessesOrSuspectsInputModal(
  RecInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord,
  Type: "Witnesses" | "Suspects"
) {
  return new ModalBuilder()
    .setCustomId(
      `${IncidentEditOptionIds[Type]}:${RecInteract.user.id}:${RecInteract.createdTimestamp}`
    )
    .setTitle(`Incident Report — Update ${Type}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Paragraph)
          .setCustomId(ModalInputIds[Type])
          .setLabel(`Incident ${Type}`)
          .setPlaceholder(`Enter the new names of ${Type.toLowerCase()} separated by commas...`)
          .setValue(IncidentRecord[Type.toLowerCase()].join(", "))
          .setMinLength(3)
          .setMaxLength(88)
          .setRequired(false)
      )
    );
}

function GetChangeIncidentNotesInputModal(
  RecInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord
) {
  return new ModalBuilder()
    .setCustomId(
      `${IncidentEditOptionIds.Notes}:${RecInteract.user.id}:${RecInteract.createdTimestamp}`
    )
    .setTitle("Incident Report — Update Notes")
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setStyle(TextInputStyle.Paragraph)
          .setCustomId(ModalInputIds.Notes)
          .setLabel("Incident Notes")
          .setPlaceholder("Enter the new notes...")
          .setValue(IncidentRecord.notes || "")
          .setMinLength(IncidentNotesLength.Min)
          .setMaxLength(IncidentNotesLength.Max)
          .setRequired(false)
      )
    );
}

function GetIncidentUpdatePromptComponentsBasedOnChanges(
  DatabaseIncRecord: GuildIncidents.IncidentRecord,
  UpdatedIncRecord: GuildIncidents.IncidentRecord
) {
  if (IsEqual(DatabaseIncRecord, UpdatedIncRecord)) {
    return [GetIncidentEditOptionsMenu()];
  } else {
    return [GetIncidentEditOptionsMenu(), GetSaveConfirmationButtons()];
  }
}

function GetUpdatePromptEmbedBasedOnChanges(
  DatabaseIncRecord: GuildIncidents.IncidentRecord,
  UpdatedIncRecord: GuildIncidents.IncidentRecord
) {
  const PromptEmbed = new EmbedBuilder()
    .setTitle(`Incident Report Modification — #${DatabaseIncRecord._id}`)
    .setColor(Colors.Greyple);

  let UpdatedPromptMsgDesc =
    "**Please select an option from the drop-down menu below to modify or update the incident report.**";

  if (!IsEqual(DatabaseIncRecord, UpdatedIncRecord)) {
    UpdatedPromptMsgDesc += "\n\n**Updated Fields:**";
    PromptEmbed.setFooter({
      text: "To confirm the changes, click the 'Confirm and Update' button, or click the 'Cancel Modifications' button to cancel them.",
    });

    if (DatabaseIncRecord.status !== UpdatedIncRecord.status) {
      UpdatedPromptMsgDesc += `\n- **Status:** \`${UpdatedIncRecord.status}\``;
    }

    if (!ArraysAreEqual(DatabaseIncRecord.suspects, UpdatedIncRecord.suspects)) {
      UpdatedPromptMsgDesc += `\n- **Suspects:** ${UpdatedIncRecord.suspects.length ? ListFormatter.format(UpdatedIncRecord.suspects) : "`[None Provided]`"}`;
    }

    if (!ArraysAreEqual(DatabaseIncRecord.witnesses, UpdatedIncRecord.witnesses)) {
      UpdatedPromptMsgDesc += `\n- **Witnesses:** ${UpdatedIncRecord.witnesses.length ? ListFormatter.format(UpdatedIncRecord.witnesses) : "`[None Provided]`"}`;
    }

    if (DatabaseIncRecord.notes !== UpdatedIncRecord.notes) {
      UpdatedPromptMsgDesc += `\n- **Notes:**\n  ${UpdatedIncRecord.notes || "[Removed]"}`;
    }
  }

  return PromptEmbed.setDescription(UpdatedPromptMsgDesc);
}

async function EditIncidentReportLogMessageBasedOnRecordAndInteraction(
  ReceivedInteract: ButtonInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord
) {
  const [ChannelId, MessageId] = (IncidentRecord.log_message ?? "").split(":");
  if (!ChannelId || !MessageId) return;

  const Channel = await ReceivedInteract.client.channels.fetch(ChannelId);
  if (!Channel?.isTextBased()) return;

  const Message = await Channel.messages.fetch(MessageId);
  if (!Message?.editable) return;

  const UpdatedAttachmentURLs = Message.embeds.flatMap((Embed) =>
    Embed.image?.url ? [SanitizeDiscordAttachmentLink(Embed.image.url)] : []
  );

  const IncidentReportEmbeds = GetIncidentReportEmbeds(
    { ...IncidentRecord, attachments: UpdatedAttachmentURLs },
    {
      guild_id: ReceivedInteract.guildId,
      channel_id: ChannelId,
    }
  );

  return Message.edit({
    embeds: IncidentReportEmbeds,
  });
}

// ---------------------------------------------------------------------------------------
// Handlers and Validation:
// ------------------------
async function HandleCommandValidationAndPossiblyGetIncident(
  RecInteract: MessageContextMenuCommandInteraction<"cached">
): Promise<ValidationResult> {
  const ReportEmbeds = RecInteract.targetMessage.embeds;
  const HandledValResult: ValidationResult = { handled: true, incident: null };
  let ReportNumber: number | null = null;
  let IncidentReport: GuildIncidents.IncidentRecord | null = null;

  if (ReportEmbeds[0]?.description?.length) {
    ReportNumber =
      Number(
        ReportEmbeds[0].description.match(
          /\bIncident\s(?:Num|Number)\**:?\**\s(?:`)?(\d+)(?:`)?\b/i
        )?.[1]
      ) || null;
  }

  if (ReportNumber) {
    IncidentReport = await GetIncidentRecord(RecInteract.guildId, ReportNumber);
  }

  if (RecInteract.targetMessage.author.id !== RecInteract.client.user.id) {
    return new ErrorEmbed()
      .useErrTemplate("UpdateIncidentReportAppNotAuthor")
      .replyToInteract(RecInteract, true)
      .then(() => HandledValResult);
  } else if (!ReportNumber) {
    return new ErrorEmbed()
      .useErrTemplate("UpdateIncidentReportNoIncNum")
      .replyToInteract(RecInteract, true)
      .then(() => HandledValResult);
  } else if (!IncidentReport) {
    return new ErrorEmbed()
      .useErrTemplate("UpdateIncidentReportIncNotFound")
      .replyToInteract(RecInteract, true)
      .then(() => HandledValResult);
  } else if (IncidentReport.reported_by.discord_id !== RecInteract.user.id) {
    const CanUpdateWithManagement = await UserHasPerms(RecInteract, { management: true });
    if (CanUpdateWithManagement === false) {
      return new UnauthorizedEmbed()
        .useErrTemplate("UpdateIncidentReportNoMgmtPerms")
        .replyToInteract(RecInteract, true)
        .then(() => HandledValResult);
    }
  }

  return { handled: false, incident: IncidentReport };
}

async function HandlePromptUpdateBasedOnModifiedRecord(
  PromptMessage: Message<true>,
  ChangeInteract:
    | StringSelectMenuInteraction<"cached">
    | ButtonInteraction<"cached">
    | ModalSubmitInteraction<"cached">,
  DatabaseIncRecord: GuildIncidents.IncidentRecord,
  UpdatedIncRecord: GuildIncidents.IncidentRecord
) {
  const UpdatedPromptEmbed = GetUpdatePromptEmbedBasedOnChanges(
    DatabaseIncRecord,
    UpdatedIncRecord
  );

  const UpdatedPromptMessage = await ChangeInteract.editReply({
    message: PromptMessage,
    embeds: [UpdatedPromptEmbed],
    components: GetIncidentUpdatePromptComponentsBasedOnChanges(
      DatabaseIncRecord,
      UpdatedIncRecord
    ),
  }).catch(() => null);

  if (!UpdatedPromptMessage) {
    return;
  }

  const NewComponentCollector = UpdatedPromptMessage.createMessageComponentCollector({
    filter: (Interact) => Interact.user.id === ChangeInteract.user.id,
    time: CompCollectorTimeout,
    idle: 10 * 60 * 1000,
  });

  return HandleComponentCollectorInteracts(
    NewComponentCollector as InteractionCollector<
      StringSelectMenuInteraction<"cached"> | ButtonInteraction<"cached">
    >,
    UpdatedPromptMessage,
    DatabaseIncRecord,
    UpdatedIncRecord
  );
}

async function HandleIncidentRecordEditWithHandler(
  RecInteract: StringSelectMenuInteraction<"cached"> | ButtonInteraction<"cached">,
  DatabaseIncRecord: GuildIncidents.IncidentRecord,
  UpdatedIncRecord: GuildIncidents.IncidentRecord,
  PromptMessage: Message<true>,
  ComponentCollector: InteractionCollector<CollectedInteraction>,
  EditHandler: (
    ...args: any
  ) => Promise<
    | ModalSubmitInteraction<"cached">
    | ButtonInteraction<"cached">
    | StringSelectMenuInteraction<"cached">
    | null
  >
) {
  const Interaction = await EditHandler(RecInteract, DatabaseIncRecord, UpdatedIncRecord);
  if (!Interaction) {
    return;
  }

  ComponentCollector.stop("PromptUpdated");
  DatabaseIncRecord =
    (await GetIncidentRecord(RecInteract.guildId, DatabaseIncRecord._id)) || DatabaseIncRecord;

  return HandlePromptUpdateBasedOnModifiedRecord(
    PromptMessage,
    Interaction,
    DatabaseIncRecord,
    UpdatedIncRecord
  );
}

async function HandleComponentCollectorInteracts(
  ComponentCollector:
    | InteractionCollector<StringSelectMenuInteraction<"cached"> | ButtonInteraction<"cached">>
    | InteractionCollector<StringSelectMenuInteraction<"cached">>,
  PromptMessage: Message<true>,
  DatabaseIncRecord: GuildIncidents.IncidentRecord,
  UpdatedIncRecord: GuildIncidents.IncidentRecord
) {
  (
    ComponentCollector as InteractionCollector<
      StringSelectMenuInteraction<"cached"> | ButtonInteraction<"cached">
    >
  ).on("collect", async (RecInteract) => {
    if (RecInteract.isStringSelectMenu()) {
      const ChosenOption = RecInteract.values[0];
      if (ChosenOption === IncidentEditOptionIds.Status) {
        await HandleIncidentRecordEditWithHandler(
          RecInteract,
          DatabaseIncRecord,
          UpdatedIncRecord,
          PromptMessage,
          ComponentCollector as unknown as any,
          HandleIncidentStatusEdit
        );
      } else if (
        ChosenOption === IncidentEditOptionIds.Suspects ||
        ChosenOption === IncidentEditOptionIds.Witnesses
      ) {
        await HandleIncidentRecordEditWithHandler(
          RecInteract,
          DatabaseIncRecord,
          UpdatedIncRecord,
          PromptMessage,
          ComponentCollector as unknown as any,
          (
            _RecInteract: StringSelectMenuInteraction<"cached">,
            _DBRecord: GuildIncidents.IncidentRecord,
            _UpdatedRecord: GuildIncidents.IncidentRecord
          ) =>
            HandleIncidentSuspectsOrWitnessesEdit(
              _RecInteract,
              _DBRecord,
              _UpdatedRecord,
              ChosenOption === IncidentEditOptionIds.Suspects ? "Suspects" : "Witnesses"
            )
        );
      } else if (ChosenOption === IncidentEditOptionIds.Notes) {
        await HandleIncidentRecordEditWithHandler(
          RecInteract,
          DatabaseIncRecord,
          UpdatedIncRecord,
          PromptMessage,
          ComponentCollector as unknown as any,
          HandleIncidentNotesEdit
        );
      }
    } else if (RecInteract.isButton()) {
      if (RecInteract.customId.includes(IncidentEditOptionIds.SaveConfirm)) {
        await HandleIncidentRecordUpdateConfirm(RecInteract, DatabaseIncRecord, UpdatedIncRecord);
        ComponentCollector.stop("PromptUpdated");
      } else if (RecInteract.customId.includes(IncidentEditOptionIds.SaveCancel)) {
        await HandleIncidentRecordUpdateDismiss(RecInteract);
        ComponentCollector.stop("PromptUpdated");
      }
    }

    if (!RecInteract.deferred || !RecInteract.replied) {
      RecInteract.deferUpdate().catch(() => null);
    }
  });

  ComponentCollector.on("end", async (Interacts, EndReason) => {
    if (EndReason.match(/reason: \w+Delete/) || EndReason === "PromptUpdated") return;
    const LastInteract = Interacts.last();
    if (!LastInteract) return;

    const UpdatedComps = GetIncidentUpdatePromptComponentsBasedOnChanges(
      DatabaseIncRecord,
      UpdatedIncRecord
    );

    UpdatedComps.forEach((AR) =>
      AR.components.forEach((Comp: StringSelectMenuBuilder | ButtonBuilder) =>
        Comp.setDisabled(true)
      )
    );

    return LastInteract.editReply({
      components: UpdatedComps,
    }).catch(() => null);
  });
}

async function HandleIncidentRecordUpdateDismiss(BtnInteract: ButtonInteraction<"cached">) {
  return BtnInteract.deferUpdate()
    .then(() => BtnInteract.deleteReply())
    .catch(() => null);
}

async function HandleIncidentRecordUpdateConfirm(
  BtnInteract: ButtonInteraction<"cached">,
  DatabaseIncRecord: GuildIncidents.IncidentRecord,
  UpdatedIncRecord: GuildIncidents.IncidentRecord
) {
  await BtnInteract.deferUpdate().catch(() => null);
  if (IsEqual(DatabaseIncRecord, UpdatedIncRecord)) {
    return BtnInteract.editReply({
      components: [],
      embeds: [
        new InfoEmbed()
          .setTitle("Unnecessary Update")
          .setDescription("There were no changes made to the incident report to update."),
      ],
    });
  }

  const RecordSetMap = {};
  if (DatabaseIncRecord.status !== UpdatedIncRecord.status) {
    RecordSetMap["logs.incidents.$[record].status"] = UpdatedIncRecord.status;
  }

  if (DatabaseIncRecord.notes !== UpdatedIncRecord.notes) {
    RecordSetMap["logs.incidents.$[record].notes"] = UpdatedIncRecord.notes;
  }

  if (DatabaseIncRecord.suspects !== UpdatedIncRecord.suspects) {
    RecordSetMap["logs.incidents.$[record].suspects"] = UpdatedIncRecord.suspects;
  }

  if (DatabaseIncRecord.witnesses !== UpdatedIncRecord.witnesses) {
    RecordSetMap["logs.incidents.$[record].witnesses"] = UpdatedIncRecord.witnesses;
  }

  const UpdatedDatabaseIncRecord = await GuildModel.findOneAndUpdate(
    {
      _id: BtnInteract.guildId,
      "logs.incidents._id": DatabaseIncRecord._id,
    },
    {
      $set: {
        ...RecordSetMap,
        "logs.incidents.$[record].last_updated": BtnInteract.createdAt,
        "logs.incidents.$[record].last_updated_by": {
          discord_id: BtnInteract.user.id,
          discord_username: BtnInteract.user.username,
        },
      },
    },
    {
      new: true,
      arrayFilters: [{ "record._id": DatabaseIncRecord._id }],
      projection: { "logs.incidents": 1 },
    }
  )
    .lean()
    .exec()
    .then((GDoc) => {
      return GDoc
        ? GDoc.logs.incidents.find((Record) => Record._id === DatabaseIncRecord._id) || null
        : null;
    });

  if (!UpdatedDatabaseIncRecord) {
    return new ErrorEmbed()
      .useErrTemplate("UpdateIncidentReportDBFailed")
      .replyToInteract(BtnInteract, true, true, "editReply");
  }

  return Promise.allSettled([
    EditIncidentReportLogMessageBasedOnRecordAndInteraction(BtnInteract, UpdatedDatabaseIncRecord),
    BtnInteract.editReply({
      components: [],
      embeds: [
        new SuccessEmbed()
          .setTitle("Incident Report Updated")
          .setDescription(
            `The incident report with the ID \`${DatabaseIncRecord._id}\` was successfully updated.`
          ),
      ],
    }),
  ]);
}

async function HandleIncidentStatusEdit(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  DBIncidentRecord: GuildIncidents.IncidentRecord,
  IRUpdatesCopy: GuildIncidents.IncidentRecord
) {
  const StatusPromptMsgEmbed = new EmbedBuilder()
    .setColor(Colors.Greyple)
    .setTitle("Incident Status Update")
    .setDescription(
      "**What would you like to change the status to?**\nPlease select from the drop-down list below."
    );

  await SelectInteract.update({
    components: GetIncidentUpdatePromptComponentsBasedOnChanges(DBIncidentRecord, IRUpdatesCopy),
  }).catch(() => null);

  const StatusPromptMsg = await SelectInteract.followUp({
    ephemeral: true,
    fetchReply: true,
    embeds: [StatusPromptMsgEmbed],
    components: [GetChangeIncidentStatusSelectMenuAR(DBIncidentRecord.status)],
  });

  const RecInteract = await StatusPromptMsg.awaitMessageComponent({
    filter: (Interact) => Interact.user.id === SelectInteract.user.id,
    componentType: ComponentType.StringSelect,
    time: 10 * 60 * 1000,
  }).catch(() => null);

  if (RecInteract) {
    const ChosenStatus = RecInteract.values[0];
    IRUpdatesCopy.status = ChosenStatus || DBIncidentRecord.status;

    await RecInteract.deferUpdate().catch(() => null);
    RecInteract.deleteReply().catch(() => null);
    return RecInteract;
  }

  return null;
}

async function HandleIncidentSuspectsOrWitnessesEdit(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord,
  IRUpdatesCopy: GuildIncidents.IncidentRecord,
  InputType: "Suspects" | "Witnesses"
) {
  const TextInputModal = GetChangeIncidentWitnessesOrSuspectsInputModal(
    SelectInteract,
    IncidentRecord,
    InputType
  );

  await SelectInteract.showModal(TextInputModal);
  await SelectInteract.editReply({
    components: GetIncidentUpdatePromptComponentsBasedOnChanges(IncidentRecord, IRUpdatesCopy),
  });

  const InputSubmission = await SelectInteract.awaitModalSubmit({
    filter: (Submision) => Submision.customId === TextInputModal.data.custom_id,
    time: 10 * 60 * 1000,
  }).catch(() => null);

  if (!InputSubmission) return null;
  else await InputSubmission.deferUpdate().catch(() => null);

  const NewlySetNames = InputSubmission.fields
    .getTextInputValue(ModalInputIds[InputType])
    .split(SplitRegexForInputs)
    .filter((Name) => Name.length >= 2);

  if (InputType === "Suspects") IRUpdatesCopy.suspects = NewlySetNames;
  else IRUpdatesCopy.witnesses = NewlySetNames;
  return InputSubmission;
}

async function HandleIncidentNotesEdit(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord,
  IRUpdatesCopy: GuildIncidents.IncidentRecord
) {
  const NotesInputModal = GetChangeIncidentNotesInputModal(SelectInteract, IncidentRecord);

  await SelectInteract.showModal(NotesInputModal);
  await SelectInteract.editReply({
    components: GetIncidentUpdatePromptComponentsBasedOnChanges(IncidentRecord, IRUpdatesCopy),
  }).catch(() => null);

  const InputSubmission = await SelectInteract.awaitModalSubmit({
    filter: (Submision) => Submision.customId === NotesInputModal.data.custom_id,
    time: 10 * 60 * 1000,
  }).catch(() => null);

  if (!InputSubmission) return null;
  else await InputSubmission.deferUpdate().catch(() => null);
  const NotesInput =
    InputSubmission.fields.getTextInputValue(ModalInputIds.Notes).replace(/\s+/g, " ") || null;

  if (NotesInput) {
    IRUpdatesCopy.notes = await FilterUserInput(NotesInput, {
      replacement: "#",
      replacement_type: "Character",
      filter_links_emails: true,
      guild_instance: SelectInteract.guild,
      target_channel: IncidentRecord.log_message?.split(":")?.[0],
    });
  } else {
    IRUpdatesCopy.notes = null;
  }

  return InputSubmission;
}

// ---------------------------------------------------------------------------------------
// Initial Handling:
// -----------------
async function Callback(Interaction: MessageContextMenuCommandInteraction<"cached">) {
  const ValidationResult = await HandleCommandValidationAndPossiblyGetIncident(Interaction);
  if (ValidationResult.handled && !ValidationResult.incident) return;
  await Interaction.deferReply({ ephemeral: true });

  const IncidentRecord = ValidationResult.incident as GuildIncidents.IncidentRecord;
  const IncidentRecordModified = { ...IncidentRecord };
  const UpdatePromptComps = GetIncidentEditOptionsMenu();
  const UpdatePromptEmbed = new EmbedBuilder()
    .setTitle(`Incident Report Modification — #${IncidentRecord._id}`)
    .setColor(Colors.Greyple)
    .setDescription(
      Dedent(`
        **Please select an option from the drop-down menu below to modify or update the incident report.**
      `)
    );

  const UpdatePromptMessage = await Interaction.editReply({
    embeds: [UpdatePromptEmbed],
    components: [UpdatePromptComps],
  });

  const PromptInteractsCollector = UpdatePromptMessage.createMessageComponentCollector({
    filter: (ButtonInteract) => ButtonInteract.user.id === Interaction.user.id,
    componentType: ComponentType.StringSelect,
    time: CompCollectorTimeout,
    idle: 10 * 60 * 1000,
  });

  HandleComponentCollectorInteracts(
    PromptInteractsCollector,
    UpdatePromptMessage,
    IncidentRecord,
    IncidentRecordModified
  );
}

// ---------------------------------------------------------------------------------------
// Command Definition:
// -------------------
const CommandObject: ContextMenuCommandObject = {
  callback: Callback,
  options: { user_perms: { staff: true }, cooldown: 5 },
  data: new ContextMenuCommandBuilder()
    .setName("Update Incident Report")
    .setContexts(InteractionContextType.Guild)
    .setType(ApplicationCommandType.Message),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
