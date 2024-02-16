import {
  MessageComponentInteraction,
  createComponentBuilder,
  ActionRowBuilder,
  Message,
} from "discord.js";

export default async function HandleActionCollectorExceptions(
  Err: unknown,
  Disabler?: MessageComponentInteraction | Message | (() => Promise<any>)
) {
  if (Err instanceof Error) {
    if (Err.message.match(/reason: time/)) {
      try {
        if (typeof Disabler === "function") {
          await Disabler();
        } else if (Disabler instanceof MessageComponentInteraction && Disabler.message) {
          const DisabledMsgComponents = Disabler.message.components.map((AR) => {
            return ActionRowBuilder.from({
              // @ts-expect-error; Type conflict while this logic should be correct.
              components: AR.components.map((Comp) =>
                createComponentBuilder(Comp.data).setDisabled(true)
              ),
            });
          }) as any;

          await Disabler.editReply({ components: DisabledMsgComponents });
        } else if (Disabler instanceof Message) {
          const DisabledMsgComponents = Disabler.components.map((AR) => {
            return ActionRowBuilder.from({
              // @ts-expect-error; Type conflict while this logic should be correct.
              components: AR.components.map((Comp) =>
                createComponentBuilder(Comp.data).setDisabled(true)
              ),
            });
          }) as any;

          await Disabler.edit({ components: DisabledMsgComponents });
        }
      } catch (Err: any) {}

      return null;
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion */
      return null;
    } else {
      throw Err;
    }
  }
}
