import { ErrorEmbed, InfoEmbed, SuccessEmbed, WarnEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { DutyLeaderboardEntryRegex } from "@Resources/RegularExpressions.js";
import { HandleShiftTypeValidation } from "@Utilities/Database/ShiftTypeValidators.js";
import { GetErrorId } from "@Utilities/Strings/Random.js";
import {
  SlashCommandSubcommandBuilder,
  ButtonInteraction,
  ActionRowBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  Attachment,
  Message,
} from "discord.js";

import ShiftModel, { ShiftFlags } from "@Models/Shift.js";
import ResolveUsernamesToIds from "@Utilities/Other/ResolveDiscordUsernames.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import ParseDuration from "parse-duration";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import HDuration from "humanize-duration";
import AppError from "@Utilities/Classes/AppError.js";
import Dedent from "dedent";

type LeaderboardEntry = {
  // Common to both formats
  username: string; // Matched in both patterns
  hr_time: string; // Matched in both patterns

  // Trident-specific fields (first alternative)
  user_id?: string; // Only in Trident format
  duty_ms?: string | number; // Only in Trident format (but numeric)
  shift_count?: string | number; // Only in Trident format (but numeric)

  // ERM-specific fields (second alternative)
  // (No additional unique fields; just username + hr_time)
};

const ReadableDuration = HDuration.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

const FileLabel = "Commands:Miscellaneous:Duty:Import";
const LineRegex = DutyLeaderboardEntryRegex;
// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function IsAttachmentExtensionValid(
  Interaction: SlashCommandInteraction<"cached">,
  DataFile: Attachment
): Promise<boolean> {
  if (DataFile.name.endsWith(".txt")) return true;
  return new ErrorEmbed()
    .useErrTemplate("AttachmentMustBeTextFile")
    .replyToInteract(Interaction, true)
    .then(() => false);
}

async function AwaitImportConfirmation(
  Interaction: SlashCommandInteraction<"cached">
): Promise<{ ConfirmationInteract: ButtonInteraction<"cached"> | null }> {
  const ConfirmationResponse = { ConfirmationInteract: null as ButtonInteraction<"cached"> | null };
  const ConfirmButton = new ButtonBuilder()
    .setCustomId(`confirm-import-dtime:${Interaction.user.id}`)
    .setLabel("Confirm and Proceed")
    .setStyle(ButtonStyle.Danger);

  const CancelButton = new ButtonBuilder()
    .setCustomId(`cancel-import-dtime:${Interaction.user.id}`)
    .setLabel("Cancel Import")
    .setStyle(ButtonStyle.Secondary);

  const ButtonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
    ConfirmButton,
    CancelButton,
  ]);

  const PromptEmbed = new WarnEmbed()
    .setThumbnail(null)
    .setTitle("Confirmation Required")
    .setDescription(
      Dedent(` 
        You are about to import time data from a leaderboard file. This will *add* the \
        imported time data as *a single shift per individual* to existing records.
        Please confirm that you want to proceed with this action.

        *This prompt will automatically cancel after five minutes of inactivity.*
      `)
    );

  const PromptMessage = await Interaction.reply({
    embeds: [PromptEmbed],
    components: [ButtonsRow],
    withResponse: true,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  const ButtonResponse = await PromptMessage.awaitMessageComponent({
    filter: (i) => i.user.id === Interaction.user.id,
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  }).catch((Err) => {
    if (Err instanceof Error && Err.message.includes("time")) {
      return Interaction.editReply({
        embeds: [new InfoEmbed().useInfoTemplate("DutyImportTimedOut")],
        components: [],
      }).then(() => null);
    }
    return null;
  });

  if (ButtonResponse?.customId.includes("cancel")) {
    return ButtonResponse.update({
      embeds: [new InfoEmbed().useInfoTemplate("DutyImportCancelled")],
      components: [],
    }).then(() => ConfirmationResponse);
  } else if (ButtonResponse?.customId.includes("confirm")) {
    ConfirmationResponse.ConfirmationInteract = ButtonResponse;
  }

  return ConfirmationResponse;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const ShiftType = Interaction.options.getString("shift-type", false) ?? "Default";
  const UploadedFile = Interaction.options.getAttachment("leaderboard-file", true);

  if (!(await IsAttachmentExtensionValid(Interaction, UploadedFile))) return;
  if (await HandleShiftTypeValidation(Interaction, ShiftType, true)) return;
  const { ConfirmationInteract } = await AwaitImportConfirmation(Interaction);

  if (!ConfirmationInteract) return;
  await ConfirmationInteract.update({
    embeds: [new InfoEmbed().useInfoTemplate("DutyImportInProgress")],
    components: [],
  });

  try {
    const FileContent = await (await fetch(UploadedFile.url)).text();
    const FileEntries = FileContent.split(/\r?\n/)
      .map((Line) => Line.trim())
      .filter((Line) => Line.length > 0)
      .map((Line) => (Line.match(LineRegex)?.groups as LeaderboardEntry) ?? null)
      .filter((Entry) => Entry.hr_time && !Entry.hr_time.trim().match(/^0\s*?seconds$/i))
      .map((Entry) => {
        if (!Entry.duty_ms && Entry.hr_time) {
          Entry.duty_ms = Math.round(ParseDuration(Entry.hr_time, "millisecond") ?? 0);
        } else if (typeof Entry.duty_ms === "string") {
          Entry.duty_ms = parseInt(Entry.duty_ms, 10);
        }
        return Entry as LeaderboardEntry & { duty_ms: number };
      });

    const ResolvedUserIds = await ResolveUsernamesToIds(
      Interaction.guild,
      FileEntries.filter((Entry) => !Entry.user_id && Entry.username).map((Entry) => Entry.username)
    );

    FileEntries.forEach((Entry) => {
      if (!Entry.user_id && Entry.username) {
        Entry.user_id = ResolvedUserIds.get(Entry.username) ?? undefined;
      }
    });

    const SanitizedShiftEntries = FileEntries.filter((Entry) => Entry.user_id && Entry.duty_ms).map(
      (Entry) => ({
        user: Entry.user_id!,
        guild: Interaction.guild.id,
        flag: ShiftFlags.Imported,
        type: ShiftType,
        start_timestamp: ConfirmationInteract.createdAt,
        end_timestamp: ConfirmationInteract.createdAt,
        durations: {
          on_duty_mod: Entry.duty_ms,
        },
      })
    );

    const DataParsed = {
      UsersTotal: FileEntries.length,
      ShiftsOfType: ShiftType,
      SourceFileURL: UploadedFile.url,
      TotalShiftTime: FileEntries.reduce((Acc, Entry) => Acc + Entry.duty_ms, 0),
      UnresolvedUsers: FileEntries.length - SanitizedShiftEntries.length,
      ShiftsTotal: FileEntries.reduce((Acc, Entry) => {
        return typeof Entry.shift_count === "string"
          ? Acc + parseInt(Entry.shift_count, 10)
          : Acc + (Entry.shift_count ?? 0);
      }, 0),
    };

    const UnresolvedUsersText =
      DataParsed.UnresolvedUsers > 0
        ? `; ${DataParsed.UnresolvedUsers} unresolved (not found).`
        : "";

    try {
      await ShiftModel.insertMany(SanitizedShiftEntries);
    } catch (dbError: any) {
      const ErrorId = GetErrorId();
      AppLogger.error({
        message: "Failed to import duty data into the database.",
        error_id: ErrorId,
        label: FileLabel,
        stack: dbError.stack,
      });

      return new ErrorEmbed()
        .useErrTemplate("DatabaseError")
        .setErrorId(ErrorId)
        .replyToInteract(ConfirmationInteract, false, false, "editReply");
    }

    return Promise.allSettled([
      ShiftActionLogger.LogShiftTimeImport(ConfirmationInteract, DataParsed),
      new SuccessEmbed()
        .setThumbnail(null)
        .setTitle("Import Completed")
        .setDescription(
          Dedent(`
            The duty time import has been completed successfully. The following is a summary of the imported data:
            - **Total Staff:** ${DataParsed.UsersTotal}${UnresolvedUsersText}
            - **Under Shift Type:** ${DataParsed.ShiftsOfType}
            - **Total Shift Time:** ${ReadableDuration(DataParsed.TotalShiftTime)}
          `)
        )
        .replyToInteract(ConfirmationInteract, false, true, "editReply"),
    ]);
  } catch (Err: any) {
    const ErrorId = GetErrorId();
    const ResponseEmbed = new ErrorEmbed().setErrorId(ErrorId);

    if (Err instanceof AppError && Err.is_showable) ResponseEmbed.useErrClass(Err);
    else ResponseEmbed.useErrTemplate("AppError");
    await ConfirmationInteract.editReply({
      embeds: [ResponseEmbed],
      components: [],
    });

    AppLogger.error({
      message: "Import duty time from leaderboard file failed;",
      error_id: ErrorId,
      label: FileLabel,
      stack: Err.stack,
    });
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("import")
    .setDescription(
      "Transfer and migrate duty time from alternative apps into this system using a .txt leaderboard file."
    )
    .addAttachmentOption((Opt) =>
      Opt.setName("leaderboard-file")
        .setDescription("Leaderboard text file with recorded duty times.")
        .setRequired(true)
    )
    .addStringOption((Opt) =>
      Opt.setName("shift-type")
        .setDescription(
          "The shift type to add the imported time to. Defaults to the application's default type."
        )
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
