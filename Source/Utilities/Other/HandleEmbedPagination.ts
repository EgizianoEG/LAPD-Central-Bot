import { RandomString } from "@Utilities/Strings/Random.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  InteractionResponse,
  ButtonInteraction,
  DiscordAPIError,
  ComponentType,
  EmbedBuilder,
  Message,
  ModalBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextInputBuilder,
} from "discord.js";

import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetPredefinedNavButtons from "./GetNavButtons.js";
import HandleCollectorFiltering from "./HandleCollectorFilter.js";
const Clamp = (Value: number, Min: number, Max: number) => Math.min(Math.max(Value, Min), Max);

// ---------------------------------------------------------------------------------------
/**
 * Handles the pagination process for a given embeds array.
 * @notice Some bugs may appear if not using the `fetchReply: true` field in message options.
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
  const NavigationButtons = GetPredefinedNavButtons(Interact, Pages.length, true, true);
  const ReplyMethod = Interact.deferred ? "editReply" : Interact.replied ? "followUp" : "reply";
  const ResponseMessage: Message | InteractionResponse = await Interact[ReplyMethod as any]({
    components: Pages.length > 1 ? [NavigationButtons] : undefined,
    fetchReply: true,
    embeds: [Pages[0]],
  });

  // Do not paginate if there is only one page received.
  if (Pages.length === 1) return;
  const ComponentCollector = ResponseMessage.createMessageComponentCollector({
    filter: (Btn) => HandleCollectorFiltering(Interact, Btn),
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  ComponentCollector.on("collect", async (NavInteraction: ButtonInteraction<"cached">) => {
    let NewPageIndex: number = -1;
    if (NavInteraction.customId.includes("current")) {
      const SPNum = await HandlePageSelection(Pages, CurrPageIndex, NavInteraction);
      if (SPNum) NewPageIndex = SPNum;
      else return;
    }

    if (NewPageIndex === -1) {
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
    }

    if (NewPageIndex === CurrPageIndex) return;
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

    NavInteraction.editReply({
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

// ---------------------------------------------------------------------------------------
// Utility:
// --------
async function HandlePageSelection(
  Pages: EmbedBuilder[],
  CurrentIndex: number,
  BtnInteract: ButtonInteraction<"cached">
): Promise<number | null> {
  const PageSelectModal = GetPageSelectModal(BtnInteract, Pages.length, CurrentIndex);
  BtnInteract.showModal(PageSelectModal);

  const ModalSubmission = await BtnInteract.awaitModalSubmit({
    time: 5 * 60 * 1000,
    filter: (MS) =>
      MS.user.id === BtnInteract.user.id && MS.customId === PageSelectModal.data.custom_id,
  }).catch(() => null);

  if (!ModalSubmission) return null;
  const InputPageNum = ModalSubmission.fields.getTextInputValue("page-num");
  const ParsedNumber = Number(InputPageNum);

  if (!InputPageNum.match(/^\d+$/) || !ParsedNumber || ParsedNumber < 1) {
    await new ErrorEmbed()
      .useErrTemplate("InvalidPageNumber")
      .replyToInteract(ModalSubmission, true);
    return null;
  }

  if (ParsedNumber > Pages.length) {
    await new ErrorEmbed().useErrTemplate("PageNotFoundWN").replyToInteract(ModalSubmission, true);
    return null;
  }

  await ModalSubmission.deferUpdate();
  return ParsedNumber - 1;
}

function GetPageSelectModal(
  BtnInteract: ButtonInteraction<"cached">,
  TotalPages: number,
  CurrPageIndex: number
) {
  return new ModalBuilder()
    .setTitle("Page Selection")
    .setCustomId(
      `paginate-page-select:${BtnInteract.user.id}:${BtnInteract.guildId}:${RandomString(3)}`
    )
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setPlaceholder(`Type in a page number between 1 and ${TotalPages}...`)
          .setLabel("Page Number")
          .setCustomId("page-num")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(TotalPages > 9 ? 2 : 1)
          .setValue(`${CurrPageIndex + 1}`)
      )
    );
}
