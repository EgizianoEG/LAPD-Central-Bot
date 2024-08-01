// Dependencies:
// -------------

import {
  User,
  Colors,
  Message,
  Collection,
  userMention,
  ButtonStyle,
  ModalBuilder,
  EmbedBuilder,
  ButtonBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextInputBuilder,
  ButtonInteraction,
  InteractionResponse,
  UserSelectMenuBuilder,
  ModalSubmitInteraction,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import LogArrestReport, {
  type ArresteeInfoType,
  type ReporterInfoType,
} from "@Utilities/Other/LogArrestReport.js";

import { RandomString } from "@Utilities/Strings/Random.js";
import { GuildArrests } from "@Typings/Utilities/Database.js";
import { ReporterInfo } from "../Log.js";
import { UserHasPermsV2 } from "@Utilities/Database/UserHasPermissions.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { FormatCharges, FormatHeight, FormatAge } from "@Utilities/Strings/Formatters.js";
import { IsValidPersonHeight, IsValidRobloxUsername } from "@Utilities/Other/Validators.js";

import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import GetBookingMugshot from "@Utilities/Other/ThumbToMugshot.js";
import GetUserThumbnail from "@Utilities/Roblox/GetUserThumb.js";
import GetIdByUsername from "@Utilities/Roblox/GetIdByUsername.js";
import ERLCAgeGroups from "@Resources/ERLCAgeGroups.js";
import GetUserInfo from "@Utilities/Roblox/GetUserInfo.js";
import GuildModel from "@Models/Guild.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import Dedent from "dedent";

const ListFormatter = new Intl.ListFormat("en");
export type CmdOptionsType = {
  Arrestee: string;
  AgeGroup: (typeof ERLCAgeGroups)[number]["name"];
  Gender: "Male" | "Female";
  Height: `${number}'${number}"`;
  Weight: number;
};

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Generates a random booking number based on the provided ArrestRecords.
 * @param ArrestRecords - An array of ArrestRecord objects.
 * @returns A random booking number.
 */
function GetBookingNumber(ArrestRecords: GuildArrests.ArrestRecord[]) {
  const RecordedBookingNums = ArrestRecords.map((Record) => Record._id);
  return Number(RandomString(4, /\d/, RecordedBookingNums));
}

/**
 * Handles the validation of the slash command inputs.
 * @param Interaction
 * @param CmdOptions
 * @returns
 */
async function HandleCmdOptsValidation(
  Interaction: SlashCommandInteraction<"cached">,
  CmdOptions: CmdOptionsType,
  Reporter: ReporterInfo
): Promise<ReturnType<ErrorEmbed["replyToInteract"]> | null> {
  if (!IsValidPersonHeight(CmdOptions.Height)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedPersonHeight")
      .replyToInteract(Interaction, true, true);
  }

  if (!IsValidRobloxUsername(CmdOptions.Arrestee)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedRobloxUsername", CmdOptions.Arrestee)
      .replyToInteract(Interaction, true, true);
  }

  const [ARobloxId, , WasUserFound] = await GetIdByUsername(CmdOptions.Arrestee, true);
  if (!WasUserFound) {
    return new ErrorEmbed()
      .useErrTemplate("NonexistentRobloxUsername", CmdOptions.Arrestee)
      .replyToInteract(Interaction, true, true);
  } else if (Reporter.RobloxUserId === ARobloxId) {
    return new ErrorEmbed()
      .useErrTemplate("SelfArrestAttempt")
      .replyToInteract(Interaction, true, true);
  }

  return null;
}

/**
 * Filters out assistant officers from a collection of users based on their permissions and the ID of the reporter.
 * @param {string} ReporterId - A string that represents the ID of the user who reported the arrest or is making the request.
 * @param {string} GuildId - A string that represents the ID of the guild.
 * @param UsersCollection - A collection of users (assistant officers).
 * @returns
 */
async function FilterAsstOfficers(
  ReporterId: string,
  GuildId: string,
  UsersCollection: Collection<string, User>
) {
  if (!UsersCollection.size) return UsersCollection;

  const Perms = await UserHasPermsV2(
    [...UsersCollection.keys()],
    GuildId,
    {
      management: true,
      staff: true,
      $or: true,
    },
    true
  );

  UsersCollection.delete(ReporterId);
  UsersCollection.sweep((User) => User.bot || !Perms[User.id]);
  return UsersCollection;
}

/**
 * Self-explanatory.
 * @param ButtonInteract
 * @returns
 */
async function OnReportCancellation(ButtonInteract: ButtonInteraction<"cached">) {
  return ButtonInteract.editReply({
    components: [],
    content: "",
    embeds: [
      new InfoEmbed()
        .setTitle("Report Cancelled")
        .setDescription("The report submission has been cancelled, and it hasn't been logged."),
    ],
  });
}

/**
 * Self-explanatory.
 * @param ButtonInteract
 * @param ReporterInfo
 * @param ArresteeInfo
 * @returns
 */
async function OnReportConfirmation(
  ButtonInteract: ButtonInteraction<"cached">,
  ReporterInfo: ReporterInfoType,
  ArresteeInfo: ArresteeInfoType
) {
  const LoggedReport = await LogArrestReport(ButtonInteract, ArresteeInfo, ReporterInfo);
  const RSDescription = Dedent(`
      The arrest report has been successfully submitted and logged.
      - Booking Number: \`${LoggedReport.booking_number}\`
      - Logged Report Link: ${LoggedReport.main_msg_link ?? "N/A"} 
    `);

  return ButtonInteract.editReply({
    embeds: [new SuccessEmbed().setTitle("Report Logged").setDescription(RSDescription)],
    components: [],
    content: "",
  });
}

/**
 * TODO: Filter charges input for spam & English profanity.
 * @param ModalInteraction
 * @param CmdInteraction
 */
async function OnChargesModalSubmission(
  CmdInteract: SlashCommandInteraction<"cached">,
  CmdOptions: CmdOptionsType,
  ReporterMainInfo: ReporterInfo,
  ModalInteraction: ModalSubmitInteraction<"cached">
) {
  await ModalInteraction.deferReply({ ephemeral: true });
  const [ArresteeId] = await GetIdByUsername(CmdOptions.Arrestee, true);
  const ARUserInfo = await GetUserInfo(ArresteeId);
  const ThumbUrl = await GetUserThumbnail(ArresteeId, "180x180", "png", "headshot");
  const GuildDoc = await GuildModel.findOne({ _id: CmdInteract.guildId }, { logs: 1, settings: 1 });

  let AsstOfficers: string[] = [];
  const FCharges = FormatCharges(ModalInteraction.fields.getTextInputValue("charges-text"));
  const ArrestNotes = ModalInteraction.fields.getTextInputValue("arrest-notes");
  const BookingNumber = GetBookingNumber(GuildDoc!.logs.arrests as any);
  const BookingMugshotURL = await GetBookingMugshot<true>({
    return_url: true,
    user_thumb_url: ThumbUrl,
    booking_num: BookingNumber,
    user_gender: CmdOptions.Gender,
  });

  const ConfirmationEmbed = new EmbedBuilder()
    .setTitle("Arrest Report - Confirmation")
    .setDescription("Assisting Officers: N/A")
    .setThumbnail(BookingMugshotURL)
    .setColor(Colors.Gold)
    .setFields([
      {
        name: "Arrestee",
        value: `${ARUserInfo.displayName} (@${ARUserInfo.name})`,
        inline: true,
      },
      {
        name: "Gender",
        value: CmdOptions.Gender,
        inline: true,
      },
      {
        name: "Arrest Age",
        value: CmdOptions.AgeGroup,
        inline: true,
      },
      {
        name: "Height",
        value: CmdOptions.Height,
        inline: true,
      },
      {
        name: "Weight",
        value: CmdOptions.Weight + " lbs",
        inline: true,
      },
      {
        name: "Convicted Charges",
        value: FCharges.join("\n"),
        inline: false,
      },
    ]);

  if (ArrestNotes?.length) {
    ConfirmationEmbed.addFields({
      name: "Arrest Notes",
      value: "```fix\n" + ArrestNotes + "```",
      inline: false,
    });
  }

  const ButtonsActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("confirm-report")
      .setLabel("Confirm and Submit")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("cancel-report")
      .setLabel("Cancel Report")
      .setStyle(ButtonStyle.Danger)
  );

  const AsstOfficersMenu = new ActionRowBuilder<UserSelectMenuBuilder>().setComponents(
    new UserSelectMenuBuilder()
      .setPlaceholder("Select the arrest's assisting officers.")
      .setCustomId("assisting-officers")
      .setMinValues(0)
      .setMaxValues(6)
  );

  const ConfirmationMsg = await ModalInteraction.editReply({
    content: `<@${CmdInteract.user.id}>, please review the following report information before submitting.`,
    components: [AsstOfficersMenu, ButtonsActionRow],
    embeds: [ConfirmationEmbed],
  });

  const ComponentCollector = ConfirmationMsg.createMessageComponentCollector({
    filter: (Interact) => HandleCollectorFiltering(CmdInteract, Interact),
    time: 5 * 60_000,
  });

  ComponentCollector.on("collect", async (ReceivedInteract) => {
    if (ReceivedInteract.isUserSelectMenu() && ReceivedInteract.customId === "assisting-officers") {
      await ReceivedInteract.deferUpdate();
      const Filtered = await FilterAsstOfficers(
        CmdInteract.user.id,
        CmdInteract.guildId,
        ReceivedInteract.users
      );

      AsstOfficers = [...Filtered.keys()];
      AsstOfficersMenu.components[0].setDefaultUsers(AsstOfficers);
      const FormattedMentions =
        ListFormatter.format(AsstOfficers.map((Id) => userMention(Id))) || "N/A";

      await ReceivedInteract.editReply({
        embeds: [ConfirmationEmbed.setDescription(`Assisting Officers: ${FormattedMentions}`)],
        components: [AsstOfficersMenu, ButtonsActionRow],
      }).catch(() => null);
    } else if (ReceivedInteract.isButton()) {
      if (ReceivedInteract.customId === "confirm-report") {
        await ReceivedInteract.deferUpdate();
        ComponentCollector.stop("Report Confirmation");
      } else if (ReceivedInteract.customId === "cancel-report") {
        await ReceivedInteract.deferUpdate();
        ComponentCollector.stop("Report Cancellation");
      }
    }
  });

  ComponentCollector.once("end", async (CollectedInteracts, EndReason) => {
    const LastInteraction = CollectedInteracts.last();

    if (EndReason.match(/reason: (?:\w+Delete|time)/)) {
      AsstOfficersMenu.components[0].setDisabled(true);
      ButtonsActionRow.components.forEach((Btn) => Btn.setDisabled(true));
      await ConfirmationMsg.edit({ components: [ButtonsActionRow] }).catch(() => null);
    }

    try {
      if (!LastInteraction?.isButton()) return;
      if (EndReason === "Report Confirmation") {
        const ReporterRobloxUserInfo = await GetUserInfo(ReporterMainInfo.RobloxUserId);
        const ReporterInfo: ReporterInfoType = {
          shift_active: ReporterMainInfo.ActiveShift,
          discord_user_id: CmdInteract.user.id,
          report_date: CmdInteract.createdAt,
          asst_officers: AsstOfficers,
          roblox_user: {
            display_name: ReporterRobloxUserInfo.displayName,
            name: ReporterRobloxUserInfo.name,
            id: ReporterMainInfo.RobloxUserId,
          },
        };

        const ArresteeInfo: ArresteeInfoType = {
          notes: ArrestNotes ?? null,
          booking_num: BookingNumber,
          booking_mugshot: BookingMugshotURL,
          Gender: CmdOptions.Gender,
          Height: CmdOptions.Height,
          Weight: CmdOptions.Weight,
          AgeGroup: CmdOptions.AgeGroup,
          formatted_charges: FCharges,
          roblox_user: {
            display_name: ARUserInfo.displayName,
            name: ARUserInfo.name,
            id: ArresteeId,
          },
        };

        await OnReportConfirmation(LastInteraction, ReporterInfo, ArresteeInfo);
      } else {
        await OnReportCancellation(LastInteraction);
      }
    } catch (Err: any) {
      AppLogger.error({
        message: "An error occurred while handling submission of an arrest report.",
        label: "Commands:Miscellaneous:Log:Arrest:FollowUpModalSubmission",
        stack: Err.stack,
      });

      if (LastInteraction) {
        await new ErrorEmbed()
          .setTitle("Error")
          .setDescription(
            "Apologies; an unknown error occurred while handling this report submission."
          )
          .replyToInteract(LastInteraction, true, true);
      }
    }
  });
}

/**
 * @param Interaction
 * @param UserData
 */
async function CmdCallback(Interaction: SlashCommandInteraction<"cached">, Reporter: ReporterInfo) {
  const CmdOptions = {
    Arrestee: Interaction.options.getString("name", true),
    Gender: Interaction.options.getString("gender", true),
    Height: FormatHeight(Interaction.options.getString("height", true)),
    Weight: Interaction.options.getInteger("weight", true),
    AgeGroup: FormatAge(Interaction.options.getInteger("arrest-age", true)),
  } as CmdOptionsType;

  const Response = await HandleCmdOptsValidation(Interaction, CmdOptions, Reporter);
  if (Response instanceof Message || Response instanceof InteractionResponse) return;

  const AdditionalDataModal = new ModalBuilder()
    .setTitle("Arrest Report - Additional Information")
    .setCustomId(`arrest-report:${Interaction.user.id}:${Interaction.guildId}:${RandomString(4)}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Convicted Charges")
          .setStyle(TextInputStyle.Paragraph)
          .setCustomId("charges-text")
          .setPlaceholder("1.\n2.\n3.")
          .setMinLength(6)
          .setMaxLength(650)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Arrest Notes")
          .setStyle(TextInputStyle.Short)
          .setCustomId("arrest-notes")
          .setPlaceholder("e.g., known to be in a gang.")
          .setMinLength(6)
          .setMaxLength(128)
          .setRequired(false)
      )
    );

  const ModalFilter = (MS) => {
    return MS.user.id === Interaction.user.id && MS.customId === AdditionalDataModal.data.custom_id;
  };

  try {
    await Interaction.showModal(AdditionalDataModal);
    await Interaction.awaitModalSubmit({ time: 5 * 60_000, filter: ModalFilter }).then(
      async (Submission) => {
        await OnChargesModalSubmission(Interaction, CmdOptions, Reporter, Submission);
      }
    );
  } catch (Err: any) {
    if (Err instanceof Error && !Err.message.match(/reason: (?:\w+Delete|time)/)) {
      throw new AppError({ message: Err.message, stack: Err.stack });
    }
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: CmdCallback,
  data: new SlashCommandSubcommandBuilder()
    .setName("arrest")
    .setDescription(
      "Creates a database entry to log an arrest and generate a corresponding report."
    )
    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The username of the arrested suspect.")
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
    )
    .addStringOption((Option) =>
      Option.setName("gender")
        .setDescription("The gender of the apprehended suspect; either male or female.")
        .setRequired(true)
        .addChoices({ name: "Male", value: "Male" }, { name: "Female", value: "Female" })
    )
    .addIntegerOption((Option) =>
      Option.setName("arrest-age")
        .setDescription("The suspect's age group at the time of arrest.")
        .setRequired(true)
        .addChoices(...ERLCAgeGroups)
    )
    .addStringOption((Option) =>
      Option.setName("height")
        .setDescription("The arrested suspect's height, measured in feet and inches.")
        .setAutocomplete(true)
        .setRequired(true)
        .setMinLength(4)
        .setMaxLength(5)
    )
    .addIntegerOption((Option) =>
      Option.setName("weight")
        .setDescription("The arrested suspect's weight in pounds (lbs).")
        .setRequired(true)
        .setMinValue(25)
        .setMaxValue(700)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
