import AppLogger from "@Utilities/Classes/AppLogger.js";
import { IsValidDiscordId } from "@Utilities/Other/Validators.js";
import { differenceInMilliseconds } from "date-fns";
import { InfoEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { UserActivityNoticeMgmtCustomIdRegex } from "@Resources/RegularExpressions.js";
import {
  MessageFlags,
  ComponentType,
  BaseInteraction,
  ActionRowBuilder,
  createComponentBuilder,
} from "discord.js";

const UnauthorizedUsageIgnoredCompsWithCustomIds: RegExp[] = [UserActivityNoticeMgmtCustomIdRegex];

/**
 * For handling & responding to any component that have been abandoned activated.
 * Regular component Ids should have a truncated command origin (an abbreviation for what command was used),
 * the user id of who owns this component and any other additional information like a unique string; all separated by a colon.
 * @param Client
 * @param Interaction
 * @returns
 */
export default async function HandleAbandonedInteractions(
  Client: DiscordClient,
  Interaction: BaseInteraction
) {
  if (!Interaction.isMessageComponent()) return;

  const TargetComponentListeners = `${ComponentType[Interaction.componentType].toLowerCase()}Listeners`;
  if (Client[TargetComponentListeners]?.has(Interaction.customId)) {
    const Listener = Client[TargetComponentListeners].get(Interaction.customId);
    if (typeof Listener === "function") {
      return Listener(Interaction);
    } else if (Listener === true) {
      // The received interaction is being listened to,
      // and shouldn't be handled by this function.
      return;
    }
  }

  const OriginUserId = Interaction.customId.split(":")?.[1];
  if (
    IsValidDiscordId(OriginUserId) &&
    Interaction.user.id !== OriginUserId &&
    !UnauthorizedUsageIgnoredCompsWithCustomIds.some((RegEx) => RegEx.test(Interaction.customId))
  ) {
    await new UnauthorizedEmbed()
      .useErrTemplate("UnauthorizedInteraction")
      .replyToInteract(Interaction, true);
  }

  // Making sure that the interaction is not being processed
  // by any other callbacks/listeners even if it isn't stated
  // in `Client.Listeners` before continuing.
  setTimeout(
    async function OnUnhandledCompInteraction() {
      if (Interaction.replied || Interaction.deferred) return;

      AppLogger.debug({
        custom_id: Interaction.customId,
        label: "Events:InteractionCreate:ComponentTimeoutHandler",
        message:
          "Handling an unhandled message component interaction after around 2.5 seconds of no response.",
      });

      const TimeGap = differenceInMilliseconds(
        Interaction.createdAt.getTime(),
        Interaction.message.editedTimestamp || Interaction.message.createdAt.getTime()
      );

      if (TimeGap >= 10 * 60 * 1000) {
        try {
          const DisabledMsgComponents = Interaction.message.components.map((AR) => {
            return ActionRowBuilder.from({
              type: ComponentType.ActionRow,
              components: AR.components.map((Comp) =>
                (createComponentBuilder(Comp.data) as any).setDisabled(true)
              ),
            });
          }) as any;

          if (Interaction.user.id === OriginUserId) {
            await Interaction.deferUpdate();
            await Promise.all([
              Interaction.editReply({
                components: DisabledMsgComponents,
              }),
              Interaction.followUp({
                flags: MessageFlags.Ephemeral,
                embeds: [new InfoEmbed().useInfoTemplate("ProcessTimedOut")],
              }),
            ]);
          }
        } catch {
          // Ignored.
          // There is no need to handle any errors output while
          // trying to disable the message components or provide feedback.
        }
        return;
      }

      await Interaction.deferUpdate().catch(() => null);
    } as () => void,
    2.65 * 1000
  );
}
