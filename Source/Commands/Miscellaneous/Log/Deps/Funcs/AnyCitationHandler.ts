// Dependencies:
// -------------
import {
  ModalSubmitInteraction,
  InteractionResponse,
  AttachmentBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  DiscordAPIError,
  TextInputStyle,
  ButtonBuilder,
  ComponentType,
  ModalBuilder,
  ButtonStyle,
  Message,
} from "discord.js";

import {
  FormatAge,
  FormatHeight,
  FormatUsername,
  FormatVehicleName,
  FormatCitViolations,
} from "@Utilities/Strings/Formatters.js";

import {
  IsValidLicensePlate,
  IsValidPersonHeight,
  IsValidRobloxUsername,
} from "@Utilities/Other/Validators.js";

import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { EyeColors, HairColors } from "@Resources/ERLCPDColors.js";
import { RedactLinksAndEmails } from "@Utilities/Strings/Redactor.js";
import { GetFilledCitation } from "@Utilities/Other/GetFilledCitation.js";
import { AllVehicleModels } from "@Resources/ERLCVehicles.js";
import { ReporterInfo } from "../../Log.js";
import { RandomString } from "@Utilities/Strings/Random.js";
import { TitleCase } from "@Utilities/Strings/Converters.js";
import { Citations } from "@Typings/Utilities/Generic.js";
import { Vehicles } from "@Typings/Resources.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";
import LogTrafficCitation from "@Utilities/Other/LogCitation.js";
import GetIdByUsername from "@Utilities/Roblox/GetIdByUsername.js";
import BrickColors from "@Resources/BrickColors.js";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";
import GuildModel from "@Models/Guild.js";
import Dedent from "dedent";

import AppError from "@Utilities/Classes/AppError.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

const CmdFileLabel = "Commands:Miscellaneous:Log:CitWarn";
const ColorNames = BrickColors.map((BC) => BC.name);
const EyeCNToAbbr = (CName: string) => EyeColors.find((C) => C.name === CName)?.abbreviation;
const HairCNToAbbr = (CName: string) => HairColors.find((C) => C.name === CName)?.abbreviation;

// ---------------------------------------------------------------------------------------
/**
 * Handles the execution of any citation log command; either warn or fine.
 * @param Interaction - The command interaction.
 * @param CitingOfficer - The one who invoked the command.
 * @param CmdFileLabel - A label to use for logging errors.
 */
export default async function AnyCitationCallback(
  Interaction: SlashCommandInteraction<"cached">,
  CitingOfficer: ReporterInfo,
  CmdFileLabel: string = "Commands:Miscellaneous:Log:AnyCitationHandler"
) {
  await Interaction.deferReply({ ephemeral: true });
  const CitationInfo = {
    fine_amount: Interaction.options.getInteger("fine-amount", false),
    violator: {
      name: Interaction.options.getString("name", true),
      gender: Interaction.options.getString("gender", true),
      age: FormatAge(Interaction.options.getInteger("age", true)),
      height: FormatHeight(Interaction.options.getString("height", true)),
      weight: Interaction.options.getInteger("weight", true),
      eye_color: EyeCNToAbbr(Interaction.options.getString("eye-color", true)),
      hair_color: HairCNToAbbr(Interaction.options.getString("hair-color", true)),
      lic_num: Interaction.options.getInteger("license-num", true).toString(),
      lic_is_comm: Interaction.options.getBoolean("commercial-lic", true),
      lic_class: "A",
      city: "Los Angeles",
    },
    vehicle: {
      lic_num: Interaction.options.getString("vehicle-plate", true),
      model: Interaction.options.getString("vehicle-model", true),
      color: Interaction.options.getString("vehicle-color", true),
    },
  } as Citations.AnyCitationData;

  const ValidationVars = await HandleCmdOptsValidation(Interaction, CitationInfo, CitingOfficer);
  if (ValidationVars instanceof Message || ValidationVars instanceof InteractionResponse) return;

  try {
    const [RespMsgButtons, Modal, ModalFilter] = GetAdditionalInputsModal(Interaction);
    const ResponseMsg = await Interaction.editReply({
      content: `<@${Interaction.user.id}>, please click the button below to fill out the remaining citation details.`,
      components: [RespMsgButtons],
    });

    const ActionCollector = ResponseMsg.createMessageComponentCollector({
      filter: (BI) => BI.user.id === Interaction.user.id,
      componentType: ComponentType.Button,
      time: 8 * 60_000,
    });

    ActionCollector.on("collect", async (BInteract) => {
      try {
        await BInteract.showModal(Modal);
        await BInteract.awaitModalSubmit({ time: 5 * 60_000, filter: ModalFilter }).then(
          async (Submission) => {
            ActionCollector.stop("ModalSubmitted");
            CitationInfo.violator.id = ValidationVars.violator_id;
            CitationInfo.vehicle = {
              color: CitationInfo.vehicle.color,
              year: ValidationVars.vehicle.model_year.org,
              make: ValidationVars.vehicle.brand,
              model: ValidationVars.vehicle.name,
              body_style: ValidationVars.vehicle.style,
              lic_num: CitationInfo.vehicle.lic_num.toUpperCase(),
            };
            await OnModalSubmission(Interaction, CitationInfo, CitingOfficer, Submission);
          }
        );
      } catch (Err: any) {
        AppLogger.error({
          message: "An error occurred while handling modal submission;",
          label: CmdFileLabel,
          stack: Err.stack,
          details: { ...Err },
        });
      }
    });

    ActionCollector.on("end", async (_, EndReason) => {
      if (EndReason.match(/reason: (?:\w+Delete|time)/)) return;
      try {
        RespMsgButtons.components.forEach((Btn) => Btn.setDisabled(true));
        await Interaction.editReply({ components: [RespMsgButtons] });
      } catch (Err: any) {
        if (Err instanceof DiscordAPIError && Err.code === 50_001) {
          return;
        }

        AppLogger.error({
          message: "An error occurred while ending the component collector for modal submission;",
          label: CmdFileLabel,
          stack: Err.stack,
          details: { ...Err },
        });
      }
    });
  } catch (Err: any) {
    if (Err instanceof Error && !Err.message.match(/reason: (?:\w+Delete|time)/)) {
      throw new AppError({ message: Err.message, stack: Err.stack });
    }
  }
}

// ---------------------------------------------------------------------------------------
// Local Utility Functions:
// ------------------------
/**
 * Generates a random string of 5 characters, consisting of digits, based on a list of recorded citation numbers.
 * @param {{ num: number }[]} RecordedCits - An array of objects, where each object has a property "num" that represents a recorded citation number.
 * @returns a randomly generated string of length `5`, consisting of digits, based on the input parameter.
 */
function GenerateCitationNumber(RecordedCits: { num: number }[]): number {
  return Number(
    RandomString(
      5,
      /\d/,
      RecordedCits.map((RCit) => RCit.num)
    )
  );
}

/**
 * Takes a string representing a weekday and returns a corresponding number.
 * @param {string} WeekDay - A string that represents a day of the week. A full name.
 * @returns If the input is one of the days of the week (Sunday to Saturday), the function returns the
 * corresponding number (`1` to `7`). If the input is not a valid day of the week, the function returns `0`.
 */
function WeekDayToNum(WeekDay: string): number {
  switch (WeekDay) {
    case "Sunday":
      return 1;
    case "Monday":
      return 2;
    case "Tuesday":
      return 3;
    case "Wednesday":
      return 4;
    case "Thursday":
      return 5;
    case "Friday":
      return 6;
    case "Saturday":
      return 7;
    default:
      return 0;
  }
}

/**
 * Returns the additional inputs modal to complete citation details.
 * @param CmdInteract - The interaction object received when the slash command was invoked.
 * @returns A tuple/list containing the modal show button, the modal, and the modal filter in order.
 */
function GetAdditionalInputsModal(CmdInteract: SlashCommandInteraction<"cached">) {
  const ModalShowButtonAR = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("show-modal:" + CmdInteract.user.id + ":" + CmdInteract.guildId)
      .setLabel("Complete Citation")
      .setStyle(ButtonStyle.Primary)
  );

  const Modal = new ModalBuilder()
    .setTitle("Traffic Citation - Additional Information")
    .setCustomId(`cit-log:${CmdInteract.user.id}:${CmdInteract.guildId}:${RandomString(4)}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Violator's Residence Address")
          .setStyle(TextInputStyle.Short)
          .setCustomId("residence-address")
          .setPlaceholder("e.g., 7013 Franklin Court")
          .setMinLength(6)
          .setMaxLength(70)
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Location of Violation(s)")
          .setStyle(TextInputStyle.Short)
          .setCustomId("violations-location")
          .setPlaceholder("e.g., River City Bank, Sandstone Road, Postal 205.")
          .setMinLength(6)
          .setMaxLength(70)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Violation(s)")
          .setStyle(TextInputStyle.Paragraph)
          .setCustomId("traffic-violations")
          .setPlaceholder(
            "Each violation shall be listed on a separate line.\ne.g.,\nSpeeding Over 30 mph\nSkipping Stop Sign"
          )
          .setMinLength(4)
          .setMaxLength(250)
      )
    );

  const ModalFilter = (MS: ModalSubmitInteraction) => {
    return MS.user.id === CmdInteract.user.id && MS.customId === Modal.data.custom_id;
  };

  return [ModalShowButtonAR, Modal, ModalFilter] as const;
}

/**
 * Validates the command options before the command is executed.
 * @param Interaction
 * @param CitationInfo
 * @returns If all command inputs are valid, a Promise that resolves to an object with the following properties:
 * - `violator_id`: a number representing the ID of the violator; `0` if no user was found.
 * - `vehicle`: an object representing the vehicle, including its model and brand (if the function didn't respond back).
 */
async function HandleCmdOptsValidation(
  Interaction: SlashCommandInteraction<"cached">,
  CitationInfo: Citations.CitPartialData,
  CitingOfficer: ReporterInfo
): Promise<
  | {
      violator_id: number;
      vehicle: Vehicles.VehicleModel & { brand: string };
    }
  | ReturnType<ErrorEmbed["replyToInteract"]>
> {
  if (!ColorNames.includes(CitationInfo.vehicle.color)) {
    return new ErrorEmbed().useErrTemplate("ACUnknownColor").replyToInteract(Interaction, true);
  }

  // Validate the Roblox username. Notice that the `name` property only reflects the Roblox username yet.
  if (!IsValidRobloxUsername(CitationInfo.violator.name)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedRobloxUsername", CitationInfo.violator.name)
      .replyToInteract(Interaction, true);
  }

  if (!IsValidLicensePlate(CitationInfo.vehicle.lic_num)) {
    return new ErrorEmbed()
      .useErrTemplate("InvalidLicensePlate")
      .replyToInteract(Interaction, true);
  }

  if (CitationInfo.violator?.height && !IsValidPersonHeight(CitationInfo.violator.height)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedPersonHeight")
      .replyToInteract(Interaction, true);
  }

  const VehicleFound = AllVehicleModels.find(
    (Model) =>
      FormatVehicleName(Model, { name: Model.brand, alias: Model.counterpart }) ===
      CitationInfo.vehicle.model.trim()
  );

  if (!VehicleFound) {
    return new ErrorEmbed().useErrTemplate("ACUnknownVehicle").replyToInteract(Interaction, true);
  }

  const [ViolatorID, , WasUserFound] = await GetIdByUsername(CitationInfo.violator.name, true);
  if (!WasUserFound) {
    return new ErrorEmbed()
      .useErrTemplate("NonexistentRobloxUsername", CitationInfo.violator.name)
      .replyToInteract(Interaction, true);
  } else if (CitingOfficer.RobloxUserId === ViolatorID) {
    return new ErrorEmbed()
      .useErrTemplate("SelfCitationAttempt")
      .replyToInteract(Interaction, true);
  }

  return {
    violator_id: ViolatorID,
    vehicle: { ...VehicleFound },
  };
}

/**
 * Handles post modal submission execution logic.
 * @param CmdInteract
 * @param PCitationData - The partial citation data to process and complete.
 * @param CitingOfficer - The officer who is issuing the citation (who also invoked the command).
 * @param ModalSubmission - The modal submission of the last needed information.
 */
async function OnModalSubmission(
  CmdInteract: SlashCommandInteraction<"cached">,
  PCitationData: Citations.AnyCitationData,
  CitingOfficer: ReporterInfo,
  ModalSubmission: ModalSubmitInteraction<"cached">
) {
  await ModalSubmission.deferUpdate().catch(() => null);
  const ViolatorRobloxInfo = await GetUserInfo(PCitationData.violator.id);
  const OfficerRobloxInfo = await GetUserInfo(CitingOfficer.RobloxUserId);
  const QueryFilter = { _id: CmdInteract.guildId };
  const GuildDoc = await GuildModel.findOneAndUpdate(QueryFilter, QueryFilter, {
    upsert: true,
    new: true,
  });

  const DateInfo = CmdInteract.createdAt
    .toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "long",
      month: "long",
      year: "numeric",
      day: "numeric",
      hour12: true,
    })
    .match(/(?<dow>\w+), (?<date>.+)/);

  const TimeInfo = CmdInteract.createdAt
    .toLocaleTimeString("en-US", {
      timeZone: "America/Los_Angeles",
      hour12: true,
    })
    .match(/(?<time>[\d:]+) (?<day_period>\w+)/);

  const CitationFullData: Omit<Citations.AnyCitationData, "img_url"> = {
    dov: DateInfo!.groups!.date,
    tov: TimeInfo!.groups!.time,
    dow: WeekDayToNum(DateInfo!.groups!.dow),
    ampm: TimeInfo!.groups!.day_period as any,
    num: GenerateCitationNumber(GuildDoc.logs.citations),
    vehicle: PCitationData.vehicle,
    fine_amount: PCitationData.fine_amount,

    violations: FormatCitViolations(
      RedactLinksAndEmails(ModalSubmission.fields.getTextInputValue("traffic-violations"))
    ),

    violation_loc: TitleCase(
      RedactLinksAndEmails(ModalSubmission.fields.getTextInputValue("violations-location").trim()),
      true
    ),

    violator: {
      ...PCitationData.violator,
      id: PCitationData.violator.id,
      age: PCitationData.violator.age,
      name: FormatUsername(ViolatorRobloxInfo),
      city: "Los Angeles",
      address:
        TitleCase(
          RedactLinksAndEmails(ModalSubmission.fields.getTextInputValue("residence-address").trim())
        ) || "N/A",
    },

    citing_officer: {
      discord_id: CmdInteract.user.id,
      roblox_id: CitingOfficer.RobloxUserId,
      name: OfficerRobloxInfo.name,
      display_name: OfficerRobloxInfo.displayName,
    },
  };

  const CitationType = CitationFullData.fine_amount ? "Fine" : "Warning";
  const CitationImgBuffer = await GetFilledCitation(CitationType, CitationFullData);
  const CitImageAttachment = new AttachmentBuilder(CitationImgBuffer, {
    name: `citation_${CitationFullData.num}.jpg`,
  });

  const ConfirmationButtonAR = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("confirm-citation")
      .setLabel("Confirm Information")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("cancel-citation")
      .setLabel("Cancel Citation")
      .setStyle(ButtonStyle.Danger)
  );

  const ConfirmationMsg = await CmdInteract.editReply({
    content: `<@${CmdInteract.user.id}>, please review the citation information below before submitting.`,
    components: [ConfirmationButtonAR],
    files: [CitImageAttachment],
  });

  const DisablePrompt = () => {
    ConfirmationButtonAR.components.forEach((Button) => Button.setDisabled(true));
    return ConfirmationMsg.edit({
      components: [ConfirmationButtonAR],
    });
  };

  const ButtonResponse = await ConfirmationMsg.awaitMessageComponent({
    filter: (BI) => BI.user.id === CmdInteract.user.id,
    componentType: ComponentType.Button,
    time: 8 * 60_000,
  }).catch((Err) => HandleActionCollectorExceptions(Err, DisablePrompt));

  try {
    if (!ButtonResponse) return;
    await ButtonResponse.deferUpdate();

    if (ButtonResponse.customId === "confirm-citation") {
      const MainLogMsgLink = await LogTrafficCitation(
        CitationType,
        CmdInteract,
        GuildDoc,
        CitationFullData,
        CitationImgBuffer
      );

      const CEDescription = Dedent(`
        The traffic citation has been successfully created and logged.
        - Citation Number: \`${CitationFullData.num}\`
        - Citation Link: ${MainLogMsgLink ?? "N/A"} 
      `);

      return CmdInteract.editReply({
        embeds: [new SuccessEmbed().setTitle("Citation Logged").setDescription(CEDescription)],
        components: [],
        content: "",
        files: [],
      });
    } else {
      return CmdInteract.editReply({
        components: [],
        content: "",
        files: [],
        embeds: [
          new InfoEmbed()
            .setTitle("Citation Cancelled")
            .setDescription(
              "The citation submission has been cancelled, and it hasn't been logged."
            ),
        ],
      });
    }
  } catch (Err: any) {
    AppLogger.error({
      message: "An error occurred while handling submission process of a citation.",
      label: CmdFileLabel,
      stack: Err.stack,
    });

    return new ErrorEmbed()
      .setDescription(
        "Apologies; an error occurred while handling your traffic citation log request."
      )
      .replyToInteract(ButtonResponse ?? ModalSubmission, true);
  }
}
