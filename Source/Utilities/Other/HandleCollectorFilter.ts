import { UnauthorizedEmbed } from "../Classes/ExtraEmbeds.js";
import {
  ModalSubmitInteraction,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type MessageComponentInteraction,
} from "discord.js";

type FilterableInteraction =
  | MessageComponentInteraction
  | SlashCommandInteraction
  | AnySelectMenuInteraction
  | ModalSubmitInteraction
  | ButtonInteraction;

/**
 * A helper function that filters the component collector interactions to ensure authorization
 * i.e. makes sure that the same user who initiated the interaction is the only one continuing it
 * @note This function will respond to the interaction if it is unauthorized
 * @param OriginalInteract - The user command interaction
 * @param  ReceivedInteract - The received interaction from the collector
 * @returns A boolean indicating if the interaction is authorized or not
 */
export default function HandleCollectorFiltering(
  OriginalInteract: FilterableInteraction,
  ReceivedInteract: FilterableInteraction
): boolean {
  if (OriginalInteract.user.id !== ReceivedInteract.user.id) {
    if (ReceivedInteract instanceof ModalSubmitInteraction) {
      return false;
    }

    ReceivedInteract.reply({
      ephemeral: true,
      embeds: [
        new UnauthorizedEmbed().setDescription(
          "You are not permitted to interact with a prompt that somebody else has initiated."
        ),
      ],
    }).catch(() => null);
    return false;
  } else {
    return true;
  }
}
