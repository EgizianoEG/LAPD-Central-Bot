import { BaseInteraction, CacheType } from "discord.js";
import { ErrorEmbed } from "../Classes/ExtraEmbeds.js";

const ReplyTemplates = {
  AppError: {
    Title: "Error",
    Message:
      "Apologies, a server/application error occurred while executing this command. Please attempt again at a later time.",
  },
};

/**
 * Replies to the given interaction with an error embed containing a specified title and description.
 */
export function SendErrorReply(Options: {
  Interaction: BaseInteraction<CacheType> & { replied: boolean };
  Template?: keyof typeof ReplyTemplates;
  Title?: string;
  Message?: string;
  Ephemeral?: boolean;
}) {
  if (!Options.Interaction) return;
  if (Options.Template) {
    Options.Title = ReplyTemplates[Options.Template]?.Title ?? Options.Title;
    Options.Message = ReplyTemplates[Options.Template]?.Message ?? Options.Message;
  }

  return new ErrorEmbed()
    .setTitle(Options.Title ?? "Error")
    .setDescription(Options.Message ?? "An unknown error has occurred.")
    .replyToInteract(Options.Interaction, Options.Ephemeral);
}
