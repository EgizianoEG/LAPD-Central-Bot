import { BaseInteraction, ActionRowBuilder, createComponentBuilder } from "discord.js";
import { InfoEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

/**
 * For handling & responding to buttons that have been abandoned activated.
 * Regular button custom Id should have a truncated command origin, the user id
 * of who owns this button, and guild id (if applicable); all separated by a colon.
 * @param Client
 * @param Interaction
 * @returns
 */
export default async function ButtonHandler(Client: DiscordClient, Interaction: BaseInteraction) {
  if (!Interaction.isButton()) return;
  if (Client.buttonListeners.has(Interaction.customId)) {
    await Client.buttonListeners.get(Interaction.customId)!(Interaction);
  }

  // Making sure that the interaction is not being processed
  // by any other callbacks/listeners before continuing.
  setTimeout(
    async function OnUnhandledButtonInteraction() {
      const OriginalUserId = Interaction.customId.split(":")?.[1];
      const TimeGap = Interaction.createdAt.getTime() - Interaction.message.createdAt.getTime();

      if (Interaction.replied || Interaction.deferred) return;
      if (TimeGap >= 5 * 60 * 1000) {
        const DisabledMsgComponents = Interaction.message.components.map((AR) => {
          return ActionRowBuilder.from({
            // @ts-expect-error; Type conflict while this logic is correct.
            components: AR.components.map((Comp) =>
              createComponentBuilder(Comp.data).setDisabled(true)
            ),
          });
        }) as any;

        try {
          if (Interaction.user.id === OriginalUserId) {
            await Interaction.deferUpdate();
            await Promise.all([
              Interaction.editReply({
                components: DisabledMsgComponents,
              }),
              Interaction.followUp({
                ephemeral: true,
                embeds: [new InfoEmbed().useInfoTemplate("ProcessTimedOut")],
              }),
            ]);
          } else {
            await Interaction.message
              .edit({
                components: DisabledMsgComponents,
              })
              .catch(() =>
                Interaction.editReply({
                  components: DisabledMsgComponents,
                })
              )
              .catch(() => Interaction.deferUpdate());
          }
        } catch (Err) {}
        return;
      }

      if (Interaction.user.id !== OriginalUserId) {
        await new UnauthorizedEmbed()
          .useErrTemplate("UnauthorizedInteraction")
          .replyToInteract(Interaction, true, true);
      } else {
        await Interaction.deferUpdate().catch(() => null);
      }
    } as () => void,
    2.25 * 1000
  );
}
