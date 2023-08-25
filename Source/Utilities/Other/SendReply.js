const { ErrorEmbed } = require("../Classes/ExtraEmbeds");
// ----------------------------------------------------------------

const ReplyTemplates = {
  AppError: {
    Title: "Error",
    Description:
      "Apologies, a server/application error occurred while executing this command. Please attempt again at a later time.",
  },
};

/**
 * Replies to the given interaction with an error embed containing a specified title and description.
 * @param {ErrorReplyOptions} Options
 */
function SendErrorReply(Options) {
  if (!Options.Interact) return;
  if (Options.Template) {
    Options.Title = ReplyTemplates[Options.Template]?.Title ?? Options.Title;
    Options.Message = ReplyTemplates[Options.Template]?.Message ?? Options.Message;
  }

  return new ErrorEmbed()
    .setTitle(Options.Title ?? "Error")
    .setDescription(Options.Message ?? "An unknown error occurred.")
    .replyToInteract(Options.Interact, Options.Ephemeral);
}

// // ----------------------------------------------------------------
module.exports = {
  SendErrorReply,
};
