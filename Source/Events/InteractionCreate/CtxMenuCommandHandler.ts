import AppError from "@Utilities/Classes/AppError.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import DHumanizer from "humanize-duration";
import { MessageFlags, ContextMenuCommandInteraction } from "discord.js";
import { InfoEmbed, ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { GetErrorId } from "@Utilities/Strings/Random.js";
import {
  HandleCommandCooldowns,
  HandleDevOnlyCommands,
  HandleUserPermissions,
  HandleBotPermissions,
} from "@Utilities/Other/CommandExecutionGuards.js";

const FileLogLabel = "Events:InteractionCreate:ContextMenuCommandHandler";
const ReadableDuration = DHumanizer.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Handles the execution of a context menu command interaction.
 * @param Client - The Discord client instance.
 * @param Interaction - The context menu command interaction to handle.
 * @throws {ReferenceError} If the command callback function is not found.
 */
export default async function ContextMenuCommandHandler(
  Client: DiscordClient,
  Interaction: ContextMenuCommandInteraction
) {
  if (!Interaction.isContextMenuCommand()) return;
  const CommandName = Interaction.commandName;
  const CommandObject = Client.ctx_commands.get(CommandName);

  try {
    if (!CommandObject) {
      AppLogger.warn({
        message:
          "Could not find the command object of context menu command %o; terminating command execution.",
        label: FileLogLabel,
        splat: [CommandName],
      });

      return new ErrorEmbed()
        .setDescription(
          "Attempt execution of a non-registered context menu command on the application."
        )
        .replyToInteract(Interaction, true);
    }

    await HandleCommandCooldowns(Client, Interaction, CommandObject, CommandName);
    await HandleDevOnlyCommands(CommandObject, Interaction);
    await HandleUserPermissions(CommandObject, Interaction);
    await HandleBotPermissions(CommandObject, Interaction);
    if (Interaction.replied) return;

    if (typeof CommandObject.callback === "function") {
      if (CommandObject.callback.length > 1) {
        await (CommandObject.callback as AnyCtxMenuCmdCallback)(Client, Interaction);
      } else {
        await (CommandObject.callback as AnyCtxMenuCmdCallback)(Interaction);
      }

      AppLogger.debug({
        message: "Handled execution of context menu command %o.",
        label: FileLogLabel,
        splat: [CommandName],
        details: {
          execution_time: ReadableDuration(Date.now() - Interaction.createdTimestamp),
        },
      });

      if (Interaction.replied || Interaction.deferred) return;
      await Interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          new InfoEmbed()
            .setTitle("Hold up!")
            .setDescription("This command appears to be still being worked on."),
        ],
      });
    } else {
      throw new ReferenceError(
        `The '${CommandName}' context command callback function could not be found.`
      );
    }
  } catch (Err: any) {
    const ErrorId = GetErrorId();
    AppLogger.error({
      message: "An error occurred while executing context menu command %o;",
      label: FileLogLabel,
      error_id: ErrorId,
      stack: Err.stack,
      splat: [CommandName],
    });

    if (Err instanceof AppError && Err.is_showable) {
      await new ErrorEmbed()
        .setTitle(Err.title)
        .setErrorId(ErrorId)
        .setDescription(Err.message)
        .replyToInteract(Interaction, true);
    } else {
      await new ErrorEmbed()
        .useErrTemplate("AppError")
        .setErrorId(ErrorId)
        .replyToInteract(Interaction, true);
    }
  }
}
