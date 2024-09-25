import { GuildIncidents } from "@Typings/Utilities/Database.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  MessageContextMenuCommandInteraction,
  StringSelectMenuInteraction,
  ContextMenuCommandBuilder,
  StringSelectMenuBuilder,
  ApplicationCommandType,
  InteractionContextType,
  ActionRowBuilder,
  ComponentType,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";

import Dedent from "dedent";
import GetIncidentRecord from "@Utilities/Database/GetIncidentRecord.js";

type ValidationResult = {
  handled: boolean;
  incident: GuildIncidents.IncidentRecord | null;
};

enum IncidentEditButtonIds {
  Status = "incident-edit-status",
  Suspects = "incident-edit-suspects",
  Witnesses = "incident-edit-witnesses",
  Notes = "incident-edit-notes",
}

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
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
          value: IncidentEditButtonIds.Status,
          description: "Change the incident status.",
        },
        {
          label: "Set Suspects",
          value: IncidentEditButtonIds.Suspects,
          description: "Add or remove incident suspects.",
        },
        {
          label: "Set Witnesses",
          value: IncidentEditButtonIds.Witnesses,
          description: "Add or remove incident witnesses.",
        },
        {
          label: "Set Notes",
          value: IncidentEditButtonIds.Notes,
          description: "Add or update incident notes.",
        },
      ])
  );
}

function GetSaveConfirmationButtons() {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("incident-save-confirm")
      .setLabel("Confirm and Update")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("incident-save-cancel")
      .setLabel("Cancel Modification")
      .setStyle(ButtonStyle.Danger)
  );
}

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
  }

  return { handled: false, incident: IncidentReport };
}

async function HandleIncidentStatusEdit(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord,
  IRUpdatesCopy: GuildIncidents.IncidentRecord
) {}

async function HandleIncidentSuspectsEdit(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord,
  IRUpdatesCopy: GuildIncidents.IncidentRecord
) {}

async function HandleIncidentWitnessesEdit(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord,
  IRUpdatesCopy: GuildIncidents.IncidentRecord
) {}

async function HandleIncidentNotesEdit(
  SelectInteract: StringSelectMenuInteraction<"cached">,
  IncidentRecord: GuildIncidents.IncidentRecord,
  IRUpdatesCopy: GuildIncidents.IncidentRecord
) {}

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
    time: 12.5 * 60 * 1000,
  });

  PromptInteractsCollector.on("collect", async (SelectInteract) => {
    const ChosenOption = SelectInteract.values[0];

    if (ChosenOption === IncidentEditButtonIds.Status) {
      await HandleIncidentStatusEdit(SelectInteract, IncidentRecord, IncidentRecordModified);
    } else if (ChosenOption === IncidentEditButtonIds.Suspects) {
      await HandleIncidentSuspectsEdit(SelectInteract, IncidentRecord, IncidentRecordModified);
    } else if (ChosenOption === IncidentEditButtonIds.Witnesses) {
      await HandleIncidentWitnessesEdit(SelectInteract, IncidentRecord, IncidentRecordModified);
    } else if (ChosenOption === IncidentEditButtonIds.Notes) {
      await HandleIncidentNotesEdit(SelectInteract, IncidentRecord, IncidentRecordModified);
    }

    if (!SelectInteract.deferred || !SelectInteract.replied) {
      SelectInteract.deferUpdate();
    }
  });

  PromptInteractsCollector.on("end", async (Interacts, EndReason) => {
    if (EndReason.match(/reason: \w+Delete/)) return;
    UpdatePromptComps.components[0].setDisabled(true);
    return Interaction.editReply({
      components: [UpdatePromptComps],
    }).catch(() => null);
  });
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
