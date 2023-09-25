const { UnauthorizedEmbed } = require("../../Utilities/Classes/ExtraEmbeds");

/**
 * @param {DiscordClient} _
 * @param {DiscordJS.ButtonInteraction} Interaction
 */
module.exports = async (_, Interaction) => {
  if (!Interaction.isButton()) return;
  setTimeout(() => {
    Interaction.fetchReply();
    const MessageOwnerId = Interaction.customId.match(/^(.+):(\d{17,19})(?::)?(.+)?$/i)?.[2];
    if (!Interaction.replied && !Interaction.deferred) {
      if (MessageOwnerId && Interaction.user.id !== MessageOwnerId) {
        new UnauthorizedEmbed()
          .setDescription(
            "You are not permitted to interact with a prompt/process that somebody else has initiated."
          )
          .replyToInteract(Interaction, true);
      } else {
        Interaction.deferUpdate();
      }
    }
  }, 2 * 1000);
};
