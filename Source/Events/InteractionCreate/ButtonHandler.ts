import { BaseInteraction } from "discord.js";
import { UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

export default async function (_: DiscordClient, Interaction: BaseInteraction) {
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
}
