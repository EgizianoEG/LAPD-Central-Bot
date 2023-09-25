const { UnauthorizedEmbed } = require("../../Utilities/Classes/ExtraEmbeds");

/**
 * A helper function that filters the component collector interactions to ensure authorization
 * i.e. makes sure that the same user who initiated the interaction is the only one continuing it
 * @note This function will repsond to the interaction if it is unauthorized
 * @param {SlashCommandInteraction} OriginalInteract - The user command interaction
 * @param {DiscordJS.MessageComponentInteraction} ReceivedInteract - The received interaction from the collector
 * @returns {Boolean} A boolean indicating if the interaction is authorized or not
 */
function HandleCollectorFiltering(OriginalInteract, ReceivedInteract) {
  if (OriginalInteract.user.id !== ReceivedInteract.user.id) {
    ReceivedInteract.reply({
      ephemeral: true,
      embeds: [
        new UnauthorizedEmbed().setDescription(
          "You are not permitted to interact with a prompt that somebody else has initiated."
        ),
      ],
    });
    return false;
  } else {
    return true;
  }
}

module.exports = HandleCollectorFiltering;
