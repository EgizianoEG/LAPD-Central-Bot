import { BaseInteraction, CacheType } from "discord.js";
import { ErrorMessages } from "@Resources/AppMessages.js";
import { ErrorEmbed } from "../Classes/ExtraEmbeds.js";

/**
 * Replies to the given interaction with an error embed containing a specified title and description.
 * This function does not guarantee that the reply will be successful as the reply won't be sent if an error occurs silently.
 * @param Options
 * @returns
 */
export function SendErrorReply(Options: {
  Interaction: BaseInteraction<CacheType> & { replied: boolean; reply; followUp; editReply };
  Template?: keyof typeof ErrorMessages;
  Title?: string;
  Message?: string;
  Ephemeral?: boolean;
}) {
  if (!Options.Interaction) return;
  if (Options.Template) {
    Options.Title = ErrorMessages[Options.Template]?.Title ?? Options.Title;
    Options.Message = ErrorMessages[Options.Template]?.Description ?? Options.Message;
  }

  return new ErrorEmbed()
    .setTitle(Options.Title ?? "Error")
    .setDescription(Options.Message ?? "An unknown error has occurred.")
    .replyToInteract(Options.Interaction, Options.Ephemeral)
    .catch(() => null as any);
}
