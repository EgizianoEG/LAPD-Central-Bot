import { UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { BaseInteraction } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

export default async function (_: DiscordClient, Interaction: BaseInteraction) {
  if (!Interaction.isButton()) return;

  // Give time for the button to be processed by any other callbacks/listeners before continuing.
  setTimeout(
    async function ButtonHandler() {
      const OriginalUserId = Interaction.customId.split(":")?.[1];

      if (!Interaction.replied && !Interaction.deferred) {
        if (OriginalUserId && Interaction.user.id !== OriginalUserId) {
          await new UnauthorizedEmbed()
            .setDescription(
              "You are not permitted to interact with a prompt/process that somebody else has initiated."
            )
            .replyToInteract(Interaction, true)
            .catch((Err) => {
              AppLogger.error({
                label: "Events:InteractionCreate:ButtonHandler",
                message: "An error occurred while notifying the user that they are unauthorized.",
                stack: Err.stack,
                details: {
                  ...Err,
                },
              });
            });
        } else {
          await Interaction.deferUpdate().catch((Err) => null);
        }
      }
    } as () => void,
    2.25 * 1000
  );
}
