import { MessageComponentInteraction } from "discord.js";
import { UnauthorizedEmbed } from "../Classes/ExtraEmbeds.js";

/**
 * A helper function that filters the component collector interactions to ensure authorization
 * i.e. makes sure that the same user who initiated the interaction is the only one continuing it
 * @note This function will respond to the interaction if it is unauthorized
 * @param OriginalInteract - The user command interaction
 * @param  ReceivedInteract - The received interaction from the collector
 * @returns A boolean indicating if the interaction is authorized or not
 */
export default function HandleCollectorFiltering(
  OriginalInteract: SlashCommandInteraction,
  ReceivedInteract: MessageComponentInteraction
): boolean {
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
