import {
  MessageComponentInteraction,
  createComponentBuilder,
  InteractionResponse,
  ActionRowBuilder,
  ComponentType,
  Message,
} from "discord.js";

export default async function HandleActionCollectorExceptions(
  Err: unknown,
  Disabler?: MessageComponentInteraction | Message | InteractionResponse | (() => Promise<any>)
) {
  if (Err instanceof Error) {
    if (Err.message.match(/reason: time|idle/)) {
      try {
        if (typeof Disabler === "function") {
          await Disabler();
        } else if (Disabler instanceof MessageComponentInteraction && Disabler.message) {
          const DisabledMsgComponents = Disabler.message.components.map((AR) => {
            return ActionRowBuilder.from({
              type: ComponentType.ActionRow,
              components: AR.components.map((Comp) =>
                (createComponentBuilder(Comp.data) as any).setDisabled(true)
              ),
            });
          }) as any;

          await Disabler.editReply({ components: DisabledMsgComponents });
        } else if (Disabler instanceof Message) {
          const DisabledMsgComponents = Disabler.components.map((AR) => {
            return ActionRowBuilder.from({
              type: ComponentType.ActionRow,
              components: AR.components.map((Comp) =>
                (createComponentBuilder(Comp.data) as any).setDisabled(true)
              ),
            });
          }) as any;

          await Disabler.edit({ components: DisabledMsgComponents });
        } else if (Disabler instanceof InteractionResponse) {
          const Message = await Disabler.fetch().catch(() => null);
          if (!Message) return null;

          const DisabledMsgComponents = Message.components.map((AR) => {
            return ActionRowBuilder.from({
              type: ComponentType.ActionRow,
              components: AR.components.map((Comp) =>
                (createComponentBuilder(Comp.data) as any).setDisabled(true)
              ),
            });
          }) as any;

          await Message.edit({ components: DisabledMsgComponents });
        }
      } catch {
        // Ignored.
      }

      return null;
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion */
      return null;
    } else {
      throw Err;
    }
  }
}
