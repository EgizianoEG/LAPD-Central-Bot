import { ButtonInteraction, ComponentType, DiscordAPIError, EmbedBuilder } from "discord.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetPredefinedNavButtons from "./GetNavButtons.js";
import HandleCollectorFiltering from "./HandleCollectorFilter.js";
const Clamp = (Value: number, Min: number, Max: number) => Math.min(Math.max(Value, Min), Max);

/**
 * Handles the pagination process for a given embeds array.
 * @param Pages - The embeds to paginate between; i.e. embeds representing pages. This should be an array of at least one embed.
 * @param Interact - The interaction that triggered the pagination. Should be repliable either by `followUp` or `reply`.
 * @param Context - The context of which triggered the pagination handling (used for logging errors and such). e.g. `Commands:Miscellaneous:Duty:Leaderboard`.
 * @returns This function/handler does not return anything and it handles pagination on its own.
 */
export default async function HandleEmbedPagination(
  Pages: EmbedBuilder[],
  Interact: SlashCommandInteraction | ButtonInteraction,
  Context?: string
): Promise<void> {
  let CurrPageIndex = 0;
  const NavigationButtons = GetPredefinedNavButtons(Interact, Pages.length);
  const ReplyMethod = Interact.deferred ? "editReply" : Interact.replied ? "followUp" : "reply";
  const ResponseMessage = await Interact[ReplyMethod as any]({
    components: Pages.length > 1 ? [NavigationButtons] : undefined,
    embeds: [Pages[0]],
  });

  // Do not paginate if there is only one page.
  if (Pages.length === 1) return;
  const ComponentCollector = ResponseMessage.createMessageComponentCollector({
    filter: (Btn) => HandleCollectorFiltering(Interact, Btn),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  });

  ComponentCollector.on("collect", async (NavInteraction: ButtonInteraction<"cached">) => {
    let NewPageIndex: number;
    await NavInteraction.deferUpdate();
    switch (NavInteraction.customId.split(":")[0]) {
      case "nav-next":
        NewPageIndex = Clamp(CurrPageIndex + 1, 0, Pages.length);
        break;
      case "nav-prev":
        NewPageIndex = Clamp(CurrPageIndex - 1, 0, Pages.length);
        break;
      case "nav-last":
        NewPageIndex = Pages.length - 1;
        break;
      case "nav-first":
      default:
        NewPageIndex = 0;
        break;
    }

    NavigationButtons.updateButtons(
      {
        first: NewPageIndex !== 0,
        last: NewPageIndex !== Pages.length - 1,
        prev: NewPageIndex !== 0,
        next: NewPageIndex !== Pages.length - 1,
      },
      NewPageIndex,
      Pages.length
    );

    ResponseMessage.edit({
      embeds: [Pages[NewPageIndex]],
      components: [NavigationButtons],
    })
      .then(() => {
        CurrPageIndex = NewPageIndex;
      })
      .catch((Err: any) => {
        if (Err instanceof DiscordAPIError && Err.code === 50_001) {
          return;
        }

        AppLogger.error({
          message: "An error occurred while handling embed pagination;",
          label: "Utilities:Other:HandleEmbedPagination",
          context: Context,
          stack: Err.stack,
        });
      });
  });

  ComponentCollector.on("end", async (_, EndReason: string) => {
    ComponentCollector.removeAllListeners();
    if (EndReason.match(/\w+Delete/)) return;

    try {
      NavigationButtons.components.forEach((Btn) => Btn.setDisabled(true));
      await ResponseMessage.edit({ components: [NavigationButtons] });
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && Err.code === 50_001) {
        return;
      }

      AppLogger.error({
        message: "An error occurred while ending the component collector for pagination;",
        label: "Utilities:Other:HandleEmbedPagination",
        context: Context,
        stack: Err.stack,
      });
    }
  });
}
