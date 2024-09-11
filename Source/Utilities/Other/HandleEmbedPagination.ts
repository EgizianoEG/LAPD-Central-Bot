import { RandomString } from "@Utilities/Strings/Random.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  ButtonInteraction,
  DiscordAPIError,
  ComponentType,
  EmbedBuilder,
  Message,
  Colors,
  ModalBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextInputBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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
 * @param [Ephemeral=false] - Whether the pages should be ephemeral (only visible to the one initiated the pagination). Defaults to `false`.
 * @returns This function/handler does not return anything and it handles pagination on its own.
 */
export default async function HandleEmbedPagination(
  Pages: EmbedBuilder[],
  Interact: SlashCommandInteraction | ButtonInteraction,
  Context?: string,
  Ephemeral: boolean = false
): Promise<void> {
  let CurrPageIndex = 0;
  const NavigationButtons = GetPredefinedNavButtons(Interact, Pages.length, true, true);
  const ReplyMethod = Interact.deferred ? "editReply" : Interact.replied ? "followUp" : "reply";
  const ResponseMessage: Message<true> = await Interact[ReplyMethod as any]({
    components: Pages.length > 1 ? [NavigationButtons] : undefined,
    ephemeral: Ephemeral,
    fetchReply: true,
    embeds: [Pages[0]],
  });

  // Do not handle pagination if there is only one page received.
  if (Pages.length === 1) return;
  const ComponentCollector = ResponseMessage.createMessageComponentCollector({
    filter: (Btn) => HandleCollectorFiltering(Interact, Btn),
    componentType: ComponentType.Button,
    time: 15 * 60 * 1000,
    idle: 8 * 60 * 1000,
  });

  ComponentCollector.on("collect", async (NavInteraction: ButtonInteraction<"cached">) => {
    let NewPageIndex: number = -1;
    if (NavInteraction.customId.includes("current")) {
      let SPNum: number | null = null;
      if (Pages.length > 25) {
        SPNum = await HandleModalPageSelection(Pages, CurrPageIndex, NavInteraction);
      } else {
        SPNum = await HandleSelectMenuPageSelection(Pages, CurrPageIndex, NavInteraction);
      }

      if (SPNum !== null) NewPageIndex = SPNum;
      else return;
    }

    if (NewPageIndex === -1) {
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

    try {
      if (NavInteraction.deferred) {
        await NavInteraction.editReply({
          embeds: [Pages[NewPageIndex]],
          components: [NavigationButtons],
        }).then(() => {
          CurrPageIndex = NewPageIndex;
        });
      } else {
        await NavInteraction.update({
          embeds: [Pages[NewPageIndex]],
          components: [NavigationButtons],
        }).then(() => {
          CurrPageIndex = NewPageIndex;
        });
      }
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && [50_001, 10_008].includes(Number(Err.code))) {
        return;
      }

      AppLogger.error({
        message: "An error occurred while handling embed pagination;",
        label: "Utilities:Other:HandleEmbedPagination",
        context: Context,
        stack: Err.stack,
      });
    }
  });

  ComponentCollector.on("end", async (Collected, EndReason: string) => {
    if (EndReason.match(/\w+Delete/)) return;
    try {
      NavigationButtons.components.forEach((Btn) => Btn.setDisabled(true));
      const LastInteract = Collected.last();
      if (LastInteract) {
        await LastInteract.editReply({ components: [NavigationButtons] });
      } else {
        await Interact.editReply({ components: [NavigationButtons] }).catch(
          async function CatchError() {
            return (await ResponseMessage.fetch().catch(() => null))
              ?.edit({ components: [NavigationButtons] })
              .catch(() => null);
          }
        );
      }
    } catch (Err: any) {
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
async function HandleSelectMenuPageSelection(
  Pages: EmbedBuilder[],
  CurrentIndex: number,
  BtnInteract: ButtonInteraction<"cached">
): Promise<number | null> {
  await BtnInteract.deferUpdate();
  const PageSelectMenu = GetPageSelectMenu(BtnInteract, Pages.length, CurrentIndex);
  const PromptEmbed = new EmbedBuilder()
    .setColor(Colors.Greyple)
    .setTitle("Page Selection")
    .setDescription("Please select a page to view from the dropdown menu below.");

  const PromptMsg = await BtnInteract.followUp({
    embeds: [PromptEmbed],
    components: [PageSelectMenu],
    fetchReply: true,
    ephemeral: true,
  });

  const MenuSelection = await PromptMsg.awaitMessageComponent({
    time: 5 * 60 * 1000,
    componentType: ComponentType.StringSelect,
    filter: (IC) =>
      IC.user.id === BtnInteract.user.id &&
      IC.customId === PageSelectMenu.components[0].data.custom_id,
  }).catch(() => null);

  if (!MenuSelection) return null;
  MenuSelection.deleteReply().catch(() => null);
  return Number(MenuSelection.values[0]);
}

async function HandleModalPageSelection(
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

  ModalSubmission.deferUpdate();
  return ParsedNumber - 1;
}

function GetPageSelectMenu(
  BtnInteract: ButtonInteraction<"cached">,
  TotalPages: number,
  CurrPageIndex: number
) {
  const SelectMenuActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    new StringSelectMenuBuilder()
      .setCustomId(
        `paginate-page-select:${BtnInteract.user.id}:${BtnInteract.guildId}:${RandomString(3)}`
      )
      .setPlaceholder("Select a page...")
      .setMinValues(1)
      .setMaxValues(1)
  );

  for (let i = 0; i < TotalPages && i < 25; i++) {
    SelectMenuActionRow.components[0].addOptions(
      new StringSelectMenuOptionBuilder()
        .setDefault(i === CurrPageIndex)
        .setLabel(`Page ${i + 1}`)
        .setValue(`${i}`)
    );
  }

  return SelectMenuActionRow;
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
