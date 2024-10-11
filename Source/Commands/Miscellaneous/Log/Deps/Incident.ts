import {
  Colors,
  Message,
  inlineCode,
  userMention,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  ButtonBuilder,
  ComponentType,
  TextInputStyle,
  ActionRowBuilder,
  TextInputBuilder,
  ButtonInteraction,
  time as FormatTime,
  ModalSubmitInteraction,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import {
  IncidentTypes,
  IncidentNotesLength,
  IncidentStatusesFlattened,
  IncidentDescriptionLength,
} from "@Resources/IncidentConstants.js";

import { ReporterInfo } from "../Log.js";
import { milliseconds } from "date-fns";
import { RandomString } from "@Utilities/Strings/Random.js";
import { SendGuildMessages } from "@Utilities/Other/GuildMessages.js";
import { GuildIncidents, Guilds } from "@Typings/Utilities/Database.js";
import { SanitizeDiscordAttachmentLink } from "@Utilities/Strings/OtherUtils.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { FilterUserInput, FilterUserInputOptions } from "@Utilities/Strings/Redactor.js";
import { IsValidDiscordId, IsValidDiscordAttachmentLink } from "@Utilities/Other/Validators.js";

import IncrementActiveShiftEvent from "@Utilities/Database/IncrementActiveShiftEvent.js";
import GetIncidentReportEmbeds from "@Utilities/Other/GetIncidentReportEmbeds.js";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";
import GuildModel from "@Models/Guild.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import IsEqual from "lodash/isEqual.js";
import Dedent from "dedent";

const CmdFileLabel = "Commands:Miscellaneous:Log:Incident";
const ListFormatter = new Intl.ListFormat("en");
const SplitRegexForInputs = /\s*,\s*|\s+/;

// ---------------------------------------------------------------------------------------
// Helpers:
// --------
function GetIncidentInformationModal(
  CmdInteract: SlashCommandInteraction<"cached">,
  IncidentType: string
): ModalBuilder {
  return new ModalBuilder()
    .setTitle(`Incident Report — ${IncidentType}`)
    .setCustomId(`incident-info:${CmdInteract.createdTimestamp}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("incident-desc")
          .setLabel("Incident Description")
          .setPlaceholder(
            "Narrative incident in detail, including the sequence of events, injuries, damage, and actions taken."
          )
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(IncidentDescriptionLength.Min)
          .setMaxLength(IncidentDescriptionLength.Max)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("attachments")
          .setLabel("Evidence and Attachments")
          .setPlaceholder(
            "Direct image links (Discord hosted), separated by linebreaks, that may provide additional context."
          )
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1284)
          .setMinLength(164)
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("suspects")
          .setLabel("Suspects")
          .setPlaceholder("The names of the suspects involved, separated by commas.")
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(88)
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("victims")
          .setLabel("Victims")
          .setPlaceholder("The names of the victims, separated by commas.")
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(88)
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("notes")
          .setLabel("Additional Notes")
          .setPlaceholder(
            "Anything else you would like to add or mention about the incident like its updates."
          )
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(IncidentNotesLength.Min)
          .setMaxLength(IncidentNotesLength.Max)
          .setRequired(false)
      )
    );
}

function GetWitnessesInvolvedOfficersInputModal(
  Interact: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">,
  InputType: "Officers" | "Witnesses"
): ModalBuilder {
  return new ModalBuilder()
    .setTitle(`Add ${InputType} to Incident Report`)
    .setCustomId(
      `incident-add-${InputType.toLowerCase()}:${Interact.user.id}:${Interact.createdTimestamp}`
    )
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId(InputType.toLowerCase())
          .setLabel(InputType === "Officers" ? "Involved Officers" : "Witnesses")
          .setPlaceholder(
            `The names or Discord IDs of the ${InputType.toLowerCase()} involved, separated by commas.`
          )
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(3)
          .setMaxLength(88)
          .setRequired(false)
      )
    );
}

function GetIOAndWitnessesButtons(
  CmdInteract: SlashCommandInteraction<"cached">
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId(`incident-add-io:${CmdInteract.user.id}:${CmdInteract.createdTimestamp}`)
      .setLabel("Set Involved Officers")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`incident-add-wit:${CmdInteract.user.id}:${CmdInteract.createdTimestamp}`)
      .setLabel("Set Incident Witnesses")
      .setStyle(ButtonStyle.Secondary)
  );
}

function GetConfirmationButtons(
  CmdInteract: SlashCommandInteraction<"cached">
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId(`incident-confirm:${CmdInteract.user.id}:${CmdInteract.createdTimestamp}`)
      .setLabel("Confirm Report and Submit")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`incident-cancel:${CmdInteract.user.id}:${CmdInteract.createdTimestamp}`)
      .setLabel("Cancel Incident Report")
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Generates a random incident number based on the provided incident records array.
 * @param IncidentRecords - An array of incident records. The only field matters is the `_id` field.
 * @returns A random incident number.
 */
function GetIncidentNumber(IncidentRecords: GuildIncidents.IncidentRecord[]): number {
  const RecordedBookingNums = IncidentRecords.map((Record) => Record._id);
  return Number(RandomString(6, /\d/, RecordedBookingNums));
}

/**
 * Sanitizes the input string of involved officers or witnesses by splitting it into individual names,
 * trimming whitespace, filtering out empty names, formatting each name based on its type, and finally sorts them.
 * @param Input - The input string containing names of involved officers or witnesses, separated by commas.
 * @returns An array of sanitized and sorted names.
 */
function SanitizeInvolvedOfficersOrWitnessesInput(Input: string): string[] {
  const GetNameType = (Name: string | undefined) => {
    if (Name && IsValidDiscordId(Name)) return 0;
    else return 1;
  };

  return Input.split(SplitRegexForInputs)
    .filter(Boolean)
    .map((Name) => {
      if (IsValidDiscordId(Name)) return userMention(Name);
      else return Name;
    })
    .sort((a, b) => {
      return GetNameType(a) - GetNameType(b);
    });
}

/**
 * Updates the description of a field in an EmbedBuilder object. If the field
 * with the specified name exists, its value is updated. Otherwise, a new field is added to the embed.
 * @param Embed - The EmbedBuilder object to update.
 * @param FieldName - The name of the field to update or add.
 * @param FieldValue - The new value for the field.
 */
function UpdateEmbedFieldDescription(
  Embed: EmbedBuilder,
  FieldName: string,
  FieldValue: string
): void {
  const ExistingField = Embed.data.fields?.find((Field) => Field.name === FieldName);
  if (ExistingField) {
    ExistingField.value = FieldValue;
  } else {
    Embed.addFields({ name: FieldName, value: FieldValue });
  }
}

/**
 * Extracts and returns the incident details provided in or extracted from a slash command interaction.
 * @param CmdInteract - The slash command interaction object.
 * @returns
 */
function GetCmdProvidedDetails(CmdInteract: SlashCommandInteraction<"cached">) {
  return {
    type: CmdInteract.options.getString("type", true),
    location: CmdInteract.options.getString("location", true),
    status: CmdInteract.options.getString("status", true),
  } as Partial<GuildIncidents.IncidentRecord> &
    Pick<GuildIncidents.IncidentRecord, "type" | "location" | "status">;
}

/**
 * Awaits the submission of an incident details modal.
 * @param CmdInteract - The slash command interaction object.
 * @param IncidentType - The type of incident for which details are being collected. Used for modal title.
 * @returns A promise that resolves to the modal submission or `null` if the submission times out (10 minutes) or errors.
 */
async function AwaitIncidentDetailsModalSubmission(
  CmdInteract: SlashCommandInteraction<"cached">,
  IncidentType: string
) {
  const IncidentInfoModal = GetIncidentInformationModal(CmdInteract, IncidentType);
  return CmdInteract.showModal(IncidentInfoModal).then(() =>
    CmdInteract.awaitModalSubmit({
      time: milliseconds({ minutes: 12.5 }),
      filter: (Modal) =>
        Modal.user.id === CmdInteract.user.id &&
        Modal.customId === IncidentInfoModal.data.custom_id!,
    }).catch(() => null)
  );
}

/**
 * Prepares incident data for logging based on provided command interaction, API details, and modal submission.
 * @param CmdInteract - The slash command interaction object.
 * @param CmdProvidedDetails - Partial incident record details provided by the command, including mandatory fields: type, location, and status.
 * @param ModalSubmission - The modal submission interaction object.
 * @param GuildDocument - The current list of incident records in the guild.
 * @param ReportingOfficer - Information about the officer reporting the incident.
 * @returns A promise that resolves to the prepared incident data object or `null` if attachment validation fails.
 */
async function PrepareIncidentData(
  CmdInteract: SlashCommandInteraction<"cached">,
  CmdProvidedDetails: Partial<GuildIncidents.IncidentRecord> &
    Pick<GuildIncidents.IncidentRecord, "type" | "location" | "status">,
  ModalSubmission: ModalSubmitInteraction<"cached">,
  GuildDocument: Guilds.GuildDocument,
  ReportingOfficer: ReporterInfo
): Promise<GuildIncidents.IncidentRecord | null> {
  const UTIFOpts: FilterUserInputOptions = {
    replacement: "#",
    guild_instance: CmdInteract.guild,
    replacement_type: "Character",
    filter_links_emails: true,
    utif_setting_enabled: GuildDocument.settings.utif_enabled,
  };

  const InputNotes = ModalSubmission.fields.getTextInputValue("notes").replace(/\s+/g, " ") || null;
  const Data = {
    ...CmdProvidedDetails,
    _id: GetIncidentNumber(GuildDocument.logs.incidents),

    description: await FilterUserInput(
      ModalSubmission.fields.getTextInputValue("incident-desc").replace(/\s+/g, " "),
      UTIFOpts
    ),

    officers: [],
    witnesses: [],
    suspects: ModalSubmission.fields
      .getTextInputValue("suspects")
      .split(SplitRegexForInputs)
      .filter(Boolean),

    victims: ModalSubmission.fields
      .getTextInputValue("victims")
      .split(SplitRegexForInputs)
      .filter(Boolean),

    attachments: ModalSubmission.fields
      .getTextInputValue("attachments")
      .split(SplitRegexForInputs)
      .filter(Boolean),

    notes: InputNotes ? await FilterUserInput(InputNotes, UTIFOpts) : null,
    last_updated: new Date(),
    last_updated_by: null,

    reported_on: ModalSubmission.createdAt,
    reported_by: {
      discord_id: CmdInteract.user.id,
      discord_username: CmdInteract.user.username,
      display_name: CmdInteract.member.nickname || CmdInteract.user.displayName,
      roblox_id: ReportingOfficer.RobloxUserId,
      roblox_username: await GetUserInfo(ReportingOfficer.RobloxUserId)
        .then((Res) => Res.name)
        .catch(() => "[@Unknown]"),
    },
  };

  if ((await HandleProvidedAttachmentsValidation(ModalSubmission, Data.attachments)) === true) {
    return null;
  }

  Data.attachments = Data.attachments.map(SanitizeDiscordAttachmentLink);
  return Data;
}

async function HandleProvidedAttachmentsValidation(
  ModalSubmission: ModalSubmitInteraction<"cached">,
  Attachments: string[]
): Promise<boolean> {
  if (Attachments.length === 0) return false;

  for (const Attachment of Attachments) {
    if (!IsValidDiscordAttachmentLink(Attachment, true, "image")) {
      return new ErrorEmbed()
        .useErrTemplate("LogIncidentInvalidAttachments")
        .replyToInteract(ModalSubmission, true)
        .then(() => true);
    }
  }

  return false;
}

async function InsertIncidentRecord(
  Interact: ButtonInteraction<"cached"> | SlashCommandInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord
) {
  return GuildModel.updateOne(
    { _id: Interact.guildId },
    { $push: { "logs.incidents": IncidentRecord } }
  );
}

// ---------------------------------------------------------------------------------------
// Confirmation Handling:
// ----------------------
async function OnReportConfirmation(
  BtnInteract: ButtonInteraction<"cached">,
  IncidentReport: GuildIncidents.IncidentRecord,
  IRChannelIds?: null | string | string[]
) {
  await BtnInteract.deferUpdate();
  const InsertResult = await InsertIncidentRecord(BtnInteract, IncidentReport).then((Res) => {
    IncrementActiveShiftEvent("incidents", BtnInteract.user.id, BtnInteract.guildId).catch(
      () => null
    );
    return Res;
  });

  if (InsertResult.modifiedCount === 0 || !InsertResult.acknowledged) {
    return new ErrorEmbed()
      .useErrTemplate("LogIncidentDatabaseInsertFailed")
      .replyToInteract(BtnInteract, true, true, "followUp");
  }

  let ReportSentMessageURL: string | null = null;
  if (IRChannelIds) {
    ReportSentMessageURL = await SendGuildMessages(BtnInteract, IRChannelIds, {
      embeds: GetIncidentReportEmbeds(IncidentReport, {
        channel_id: Array.isArray(IRChannelIds) ? IRChannelIds[0] : IRChannelIds,
      }),
    });
  }

  const REDescription = Dedent(`
    The incident report has been successfully submitted and logged.
    - Incident Number: \`${IncidentReport._id}\`
    - Logged Report Link: ${ReportSentMessageURL ?? "N/A"} 
  `);

  if (ReportSentMessageURL) {
    const SplatURL = ReportSentMessageURL.split("/");
    GuildModel.updateOne(
      {
        _id: BtnInteract.guildId,
        "logs.incidents._id": IncidentReport._id,
      },
      {
        $set: {
          "logs.incidents.$[record].log_message": `${SplatURL[SplatURL.length - 2]}:${SplatURL[SplatURL.length - 1]}`,
        },
      },
      {
        new: true,
        arrayFilters: [{ "record._id": IncidentReport._id }],
      }
    )
      .exec()
      .catch(() => null);
  }

  return BtnInteract.editReply({
    embeds: [new SuccessEmbed().setTitle("Report Logged").setDescription(REDescription)],
    content: "",
    components: [],
  });
}

async function OnReportCancellation(BtnInteract: ButtonInteraction<"cached">) {
  return BtnInteract.update({
    components: [],
    content: "",
    embeds: [
      new InfoEmbed()
        .setTitle("Report Cancelled")
        .setDescription("The report submission has been cancelled, and it hasn't been recorded."),
    ],
  });
}

async function OnReportInvolvedOfficersOrWitnessesAddition(
  BtnInteract: ButtonInteraction<"cached">,
  ReportData: GuildIncidents.IncidentRecord,
  IREmbeds: EmbedBuilder[],
  AdditionFor: "Officers" | "Witnesses"
) {
  const CopiedReport = { ...ReportData };
  const InputModal = GetWitnessesInvolvedOfficersInputModal(BtnInteract, AdditionFor);
  const ModalSubmission = await BtnInteract.showModal(InputModal).then(() =>
    BtnInteract.awaitModalSubmit({
      time: milliseconds({ minutes: 10 }),
      filter: (Modal) =>
        Modal.user.id === BtnInteract.user.id && Modal.customId === InputModal.data.custom_id!,
    }).catch(() => null)
  );

  if (!ModalSubmission) return;
  let InputText = ModalSubmission.components[0].components[0].value;

  if (!InputText?.trim()) InputText = "N/A";
  if (AdditionFor === "Officers") {
    CopiedReport.officers = SanitizeInvolvedOfficersOrWitnessesInput(InputText);
  } else if (AdditionFor === "Witnesses") {
    CopiedReport.witnesses = SanitizeInvolvedOfficersOrWitnessesInput(InputText);
  }

  if (!IsEqual(ReportData, CopiedReport)) {
    if (AdditionFor === "Officers") {
      IREmbeds[0].setDescription(
        Dedent(`
          Incident Number: ${inlineCode(CopiedReport._id.toString())}
          Incident Reported By: ${userMention(ModalSubmission.user.id)} on ${FormatTime(ReportData.reported_on, "f")}
          Involved Officers: ${ListFormatter.format(CopiedReport.officers)}
        `)
      );
    } else {
      UpdateEmbedFieldDescription(IREmbeds[0], "Witnesses", CopiedReport.witnesses.join(", "));
    }
  }

  return Promise.all([ModalSubmission.deferUpdate(), BtnInteract.editReply({ embeds: IREmbeds })]);
}

async function HandleIRAdditionalDetailsAndConfirmation(
  CmdInteract: SlashCommandInteraction<"cached">,
  ModalSubmission: ModalSubmitInteraction,
  CmdModalProvidedData: GuildIncidents.IncidentRecord,
  DAGuildSettings: Guilds.GuildSettings["duty_activities"]
) {
  const IncidentReportEmbeds = GetIncidentReportEmbeds(CmdModalProvidedData, {
    channel_id: CmdInteract.channelId,
  });

  const ConfirmationMsgComponents = [
    GetIOAndWitnessesButtons(CmdInteract),
    GetConfirmationButtons(CmdInteract),
  ];

  IncidentReportEmbeds[0].setColor(Colors.Gold).setTitle("Incident Report Confirmation");
  const ConfirmationMessage = (await ModalSubmission.editReply({
    content: `${userMention(CmdInteract.user.id)} - Are you sure you want to submit this incident? Revise the incident details and add involved officers or witnesses if necessary.`,
    embeds: IncidentReportEmbeds,
    components: ConfirmationMsgComponents,
  })) as Message<true>;

  ProcessReceivedIRBtnInteractions(
    CmdInteract,
    ConfirmationMessage,
    CmdModalProvidedData,
    IncidentReportEmbeds,
    ConfirmationMsgComponents,
    DAGuildSettings
  );
}

function ProcessReceivedIRBtnInteractions(
  CmdInteract: SlashCommandInteraction<"cached">,
  ConfirmationMessage: Message<true>,
  CmdModalProvidedData: GuildIncidents.IncidentRecord,
  ConfirmationMsgEmbeds: EmbedBuilder[],
  ConfirmationMsgComps: ActionRowBuilder<ButtonBuilder>[],
  DAGuildSettings: Guilds.GuildSettings["duty_activities"]
) {
  const ComponentCollector = ConfirmationMessage.createMessageComponentCollector({
    filter: (Interaction) => Interaction.user.id === CmdInteract.user.id,
    componentType: ComponentType.Button,
    time: milliseconds({ minutes: 10 }),
  });

  ComponentCollector.on("collect", async (BtnInteract) => {
    const BtnId = BtnInteract.customId;
    try {
      if (BtnId.includes("confirm")) {
        await OnReportConfirmation(
          BtnInteract,
          CmdModalProvidedData,
          DAGuildSettings.log_channels.incidents
        );
        ComponentCollector.stop("Confirmed");
      } else if (BtnId.includes("cancel")) {
        await OnReportCancellation(BtnInteract);
        ComponentCollector.stop("Cancelled");
      } else if (BtnId.includes("add-io")) {
        await OnReportInvolvedOfficersOrWitnessesAddition(
          BtnInteract,
          CmdModalProvidedData,
          ConfirmationMsgEmbeds,
          "Officers"
        );
      } else if (BtnId.includes("add-wit")) {
        await OnReportInvolvedOfficersOrWitnessesAddition(
          BtnInteract,
          CmdModalProvidedData,
          ConfirmationMsgEmbeds,
          "Witnesses"
        );
      }
    } catch (Err: any) {
      AppLogger.error({
        label: CmdFileLabel,
        message: "An error happened while handling incident report buttons.",
        stack: Err.stack,
      });

      if (Err instanceof AppError && Err.is_showable) {
        return new ErrorEmbed().useErrClass(Err).replyToInteract(BtnInteract, true, true, "reply");
      } else {
        return new ErrorEmbed()
          .useErrTemplate("UnknownError")
          .replyToInteract(BtnInteract, true, true, "reply");
      }
    }
  });

  ComponentCollector.on("end", async (Interacts, EndReason) => {
    if (
      EndReason.match(/reason: (?:\w+Delete|time|idle)/) ||
      ["Confirmed", "Cancelled"].includes(EndReason)
    ) {
      return;
    }

    const LastInteract = Interacts.last() || CmdInteract;
    ConfirmationMsgComps.forEach((ActionRow) =>
      ActionRow.components.forEach((Btn) => Btn.setDisabled(true))
    );

    await LastInteract.editReply({
      components: ConfirmationMsgComps,
    }).catch(() => {});
  });
}

// ---------------------------------------------------------------------------------------
// Initial Handling:
// -----------------
/**
 * The callback function for the `/log incident` slash command.
 * @param CmdInteract - The interaction object.
 * @param ReportingOfficer - The information about the reporting officer.
 */
async function IncidentLogCallback(
  CmdInteract: SlashCommandInteraction<"cached">,
  ReportingOfficer: ReporterInfo
) {
  const CmdProvidedDetails = GetCmdProvidedDetails(CmdInteract);
  const IDModalSubmission = await AwaitIncidentDetailsModalSubmission(
    CmdInteract,
    CmdProvidedDetails.type
  );

  if (!IDModalSubmission) return;
  await IDModalSubmission.deferReply({ ephemeral: true });

  const GuildDocument = await GuildModel.findById(
    CmdInteract.guildId,
    {
      "logs.incidents._id": 1,
      "settings.utif_enabled": 1,
      "settings.duty_activities.log_channels.incidents": 1,
    },
    { lean: true }
  ).exec();

  if (!GuildDocument) {
    return new ErrorEmbed()
      .useErrTemplate("DBGuildDocumentNotFound")
      .replyToInteract(IDModalSubmission, true, true, "editReply");
  }

  const CmdModalProvidedData = await PrepareIncidentData(
    CmdInteract,
    CmdProvidedDetails,
    IDModalSubmission,
    GuildDocument as unknown as Guilds.GuildDocument,
    ReportingOfficer
  );

  // Return if there was invalid data and a feedback has been sent to the user;
  // otherwise, continue with the incident report creation process.
  if (!CmdModalProvidedData) return;
  return HandleIRAdditionalDetailsAndConfirmation(
    CmdInteract,
    IDModalSubmission,
    CmdModalProvidedData,
    GuildDocument.settings.duty_activities
  );
}

// ---------------------------------------------------------------------------------------
// Command Structure:
// ------------------
const CommandObject = {
  callback: IncidentLogCallback,
  data: new SlashCommandSubcommandBuilder()
    .setName("incident")
    .setDescription("Creates and logs a traffic warning citation record for a person.")
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The specific category of the incident.")
        .setRequired(true)
        .setMaxLength(4)
        .setMaxLength(36)
        .setChoices(IncidentTypes.map((Type) => ({ name: Type, value: Type })))
    )
    .addStringOption((Option) =>
      Option.setName("location")
        .setDescription(
          "The precise location of the incident, including landmarks and a possible route if applicable."
        )
        .setMinLength(6)
        .setMaxLength(148)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("status")
        .setDescription("The status of the incident being reported.")
        .setChoices(IncidentStatusesFlattened.map((Status) => ({ name: Status, value: Status })))
        .setMinLength(4)
        .setMaxLength(64)
        .setRequired(true)
    ),
};

// ----------------------------------------------------------------
export default CommandObject;
