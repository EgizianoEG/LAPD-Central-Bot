import { RandomString } from "@Utilities/Strings/Random.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  InteractionReplyOptions,
  StringSelectMenuBuilder,
  RepliableInteraction,
  ButtonInteraction,
  ContainerBuilder,
  ActionRowBuilder,
  DiscordAPIError,
  ComponentType,
  EmbedBuilder,
  Message,
  Colors,
  MessageFlags,
  ModalBuilder,
  TextInputStyle,
  TextInputBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  MessageFlagsResolvable,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import AppLogger from "@Utilities/Classes/AppLogger.js";
import HandleCollectorFiltering from "./HandleCollectorFilter.js";
import GetPredefinedNavButtons, { type NavButtonsActionRow } from "./GetNavButtons.js";

// ---------------------------------------------------------------------------------------
const Clamp = (Value: number, Min: number, Max: number) => Math.min(Math.max(Value, Min), Max);
interface PagePaginationOptions {
  /**
   * The embeds to paginate between; e.g. embeds representing pages.
   * This should be an array of at least one embed or container component.
   */
  pages: (EmbedBuilder | ContainerBuilder)[];

  /**
   * The interaction that triggered the pagination.
   * Should be repliable either by `followUp`, `reply`, or `editReply`.
   */
  interact: RepliableInteraction;

  /**
   * Whether the pages should be ephemeral (only visible to the one initiated the pagination).
   * Defaults to `false`.
   */
  ephemeral?: boolean;

  /**
   * The context of which triggered the pagination handling (used for logging errors and such).
   * e.g. `Commands:Miscellaneous:___:___`.
   */
  context?: string;

  /**
   * The custom footer text to use for the components v2 paginator using components.
   * Leave empty to only add a separator component at the bottom in the case of components v2 pagination.
   */
  cv2_footer?: string;
}

/**
 * Handles the pagination process for a given embeds array.
 * @param {PagePaginationOptions} options - The options for the pagination handler.
 * @returns This function/handler does not return anything and it handles pagination on its own.
 */
export default async function HandlePagePagination({
  pages: Pages,
  interact: Interact,
  ephemeral: Ephemeral = false,
  cv2_footer: CV2Footer,
  context,
}: PagePaginationOptions): Promise<void> {
  let CurrPageIndex = 0;
  const IsComponentsV2Pagination = Pages[0] instanceof ContainerBuilder;
  const NavigationButtons = GetPredefinedNavButtons(Interact, Pages.length, true, true);
  let MsgFlags: MessageFlagsResolvable | undefined = Ephemeral ? MessageFlags.Ephemeral : undefined;

  if (IsComponentsV2Pagination) {
    MsgFlags = MsgFlags ? MsgFlags | MessageFlags.IsComponentsV2 : MessageFlags.IsComponentsV2;
    AttachComponentsV2Footer(Pages as ContainerBuilder[], CV2Footer);
    AttachComponentsV2NavButtons(Pages as ContainerBuilder[], NavigationButtons);
  }

  const PaginationReply = await HandleInitialInteractReply(Interact, Pages, MsgFlags);
  if (Pages.length === 1) return;

  const ComponentCollector = PaginationReply.createMessageComponentCollector({
    filter: (Btn) => HandleCollectorFiltering(Interact, Btn),
    componentType: ComponentType.Button,
    time: 14.5 * 60 * 1000,
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

    if (IsComponentsV2Pagination) {
      AttachComponentsV2NavButtons(Pages as ContainerBuilder[], NavigationButtons);
    }

    try {
      const EditReplyOpts = IsComponentsV2Pagination
        ? {
            components: [Pages[NewPageIndex] as ContainerBuilder],
          }
        : { embeds: [Pages[NewPageIndex] as EmbedBuilder], components: [NavigationButtons] };

      if (NavInteraction.deferred) {
        await NavInteraction.editReply(EditReplyOpts).then(() => {
          CurrPageIndex = NewPageIndex;
        });
      } else {
        await NavInteraction.update(EditReplyOpts).then(() => {
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
        stack: Err.stack,
        context,
      });
    }
  });

  ComponentCollector.on("end", async (Collected, EndReason: string) => {
    if (EndReason.match(/^\w+Delete/)) return;
    try {
      NavigationButtons.components.forEach((Btn) => Btn.setDisabled(true));
      const LastInteract = Collected.last() || Interact;
      await LastInteract.editReply({ components: [NavigationButtons] }).catch(
        async function CatchError() {
          const UpdatedResponseMsg = await PaginationReply.fetch(true).catch(() => null);
          if (!UpdatedResponseMsg?.editable) return;
          return UpdatedResponseMsg.edit({ components: [NavigationButtons] });
        }
      );
    } catch (Err: any) {
      AppLogger.error({
        message: "An error occurred while ending the component collector for pagination;",
        label: "Utilities:Other:HandleEmbedPagination",
        stack: Err.stack,
        context,
      });
    }
  });
}

// ---------------------------------------------------------------------------------------
// Utility:
// --------
async function HandleSelectMenuPageSelection(
  Pages: (EmbedBuilder | ContainerBuilder)[],
  CurrentIndex: number,
  BtnInteract: ButtonInteraction<"cached">
): Promise<number | null> {
  const PageSelectMenu = GetPageSelectMenu(BtnInteract, Pages.length, CurrentIndex);
  const PromptContainer = new ContainerBuilder()
    .setAccentColor(Colors.Greyple)
    .addTextDisplayComponents(
      new TextDisplayBuilder({
        content: "### Page Selection",
      })
    )
    .addSeparatorComponents(new SeparatorBuilder({ divider: true, spacing: 1 }))
    .addTextDisplayComponents(
      new TextDisplayBuilder({
        content: "Please select a page to view from the dropdown menu below.",
      })
    )
    .addActionRowComponents(PageSelectMenu);

  const PromptResp = await BtnInteract.reply({
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [PromptContainer],
  });

  const MenuSelection = await PromptResp.awaitMessageComponent({
    time: 8 * 60 * 1000,
    componentType: ComponentType.StringSelect,
    filter: (IC) =>
      IC.user.id === BtnInteract.user.id &&
      IC.customId === PageSelectMenu.components[0].data.custom_id,
  }).catch(() => null);

  if (!MenuSelection) return null;
  MenuSelection.deferUpdate()
    .then(() => MenuSelection.deleteReply())
    .catch(() => null);

  return Number(MenuSelection.values[0]);
}

async function HandleModalPageSelection(
  Pages: (EmbedBuilder | ContainerBuilder)[],
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

async function HandleInitialInteractReply(
  Interact: RepliableInteraction,
  Pages: (EmbedBuilder | ContainerBuilder)[],
  Flags?: InteractionReplyOptions["flags"]
): Promise<Message> {
  let ReplyMethod: "reply" | "followUp" | "editReply";
  const NavigationButtons = GetPredefinedNavButtons(Interact, Pages.length, true, true);
  const IsComponentsV2Pagination = Pages[0] instanceof ContainerBuilder;
  const ResponseOpts = IsComponentsV2Pagination
    ? {
        components: [Pages[0] as ContainerBuilder],
      }
    : {
        embeds: [Pages[0] as EmbedBuilder],
        components: [NavigationButtons],
      };

  if (Pages.length > 1) {
    ResponseOpts.components = IsComponentsV2Pagination
      ? [ResponseOpts.components[0] as ContainerBuilder]
      : [NavigationButtons];
  }

  if (Interact.deferred) {
    ReplyMethod = "editReply";
  } else if (Interact.replied) {
    ReplyMethod = "followUp";
  } else {
    ReplyMethod = "reply";
  }

  if (ReplyMethod === "reply") {
    return Interact.reply({
      ...ResponseOpts,
      withResponse: true,
    }).then((Resp) => Resp.resource!.message!);
  } else if (ReplyMethod === "followUp") {
    return Interact.followUp({
      ...ResponseOpts,
      flags: Flags,
    });
  } else {
    return Interact.editReply({
      ...ResponseOpts,
    });
  }
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

function AttachComponentsV2NavButtons(
  Pages: ContainerBuilder[],
  NavButtonsAR: NavButtonsActionRow
): void {
  const PagesLength = Pages.length;
  return Pages.forEach((Page) => {
    if (PagesLength > 1) {
      if (Page.components[Page.components.length - 1].data.type === ComponentType.ActionRow) {
        Page.spliceComponents(-1, 1);
      }

      return Page.addActionRowComponents(NavButtonsAR);
    } else {
      return Page;
    }
  });
}

function AttachComponentsV2Footer(Pages: ContainerBuilder[], FooterText?: string): void {
  return Pages.forEach((Page) => {
    Page.addSeparatorComponents(new SeparatorBuilder({ divider: true }));
    if (FooterText)
      Page.addTextDisplayComponents(new TextDisplayBuilder({ content: `-# ${FooterText}` }));
  });
}
