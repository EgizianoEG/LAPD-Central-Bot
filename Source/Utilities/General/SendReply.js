/* eslint-disable no-unused-vars */
const { BaseInteraction } = require("discord.js");
const { ErrorEmbed } = require("./ExtraEmbeds");
// ------------------------------------------------------------------------------------

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
 * @returns {Promise<InteractionResponse|undefined>}
 */
function SendErrorReply(Options) {
  if (Options.Template) {
    Options.Title = ReplyTemplates[Options.Template]?.Title ?? Options.Title;
    Options.Message = ReplyTemplates[Options.Template]?.Message ?? Options.Message;
  }

  const ReplyMethod = !Options.Interact.replied ? "reply" : "followUp";
  return Options.Interact[ReplyMethod]({
    ephemeral: Options.Ephemeral,
    embeds: [
      new ErrorEmbed()
        .setTitle(Options.Title ?? "Error")
        .setDescription(Options.Message ?? "An unknown error occurred."),
    ],
  });
}

// ------------------------------------------------------------------------------------
module.exports = {
  SendErrorReply,
};

// ------------------------------------------------------------------------------------
// Types:
// ------
/**
 * @typedef {Object} ErrorReplyOptions
 * @property {BaseInteraction} Interact The repliable interaction
 * @property {Boolean} [Ephemeral] Whether this reply is ephemeral or publicly visible
 * @property {String} [Title] The title of the error reply; defaults to "Error"
 * @property {String} [Message] The description of the error reply
 * @property {"AppError"} [Template] A pre-defined template with title and description to use instead of providing `Title` and `Description` options. `Ephemeral` option is still respected.
 */
