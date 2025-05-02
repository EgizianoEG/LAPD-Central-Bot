import {
  MessageComponentInteraction,
  MessageFlagsResolvable,
  APIThumbnailComponent,
  RepliableInteraction,
  InteractionResponse,
  CommandInteraction,
  TextDisplayBuilder,
  ButtonInteraction,
  ContainerBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  ColorResolvable,
  SectionBuilder,
  MessageFlags,
  resolveColor,
  Message,
} from "discord.js";

import { ErrorMessages, InfoMessages } from "@Resources/AppMessages.js";
import { format as FormatString } from "node:util";
import { Colors } from "@Config/Shared.js";
import AppError from "./AppError.js";

type ThumbnailAccessory =
  | APIThumbnailComponent
  | ThumbnailBuilder
  | ((builder: ThumbnailBuilder) => ThumbnailBuilder);

class BaseExtraContainer extends ContainerBuilder {
  protected _title: string | null = null;
  protected _description: string | null = null;
  protected _accentColor: ColorResolvable | null = null;
  protected _thumbnail: string | null = null;
  protected _footer: string | null = null;

  public get title(): string | null {
    return this._title;
  }

  public get description(): string | null {
    return this._description;
  }

  public get accentColor(): ColorResolvable | null {
    return this._accentColor;
  }

  public get thumbnail(): string | null {
    return this._thumbnail;
  }

  public get footer(): string | null {
    return this._footer;
  }

  constructor() {
    super();
    this.addTextDisplayComponents(
      new TextDisplayBuilder({
        content: this._title ?? "### [Title]",
      }),
      new TextDisplayBuilder({
        content: this._description ?? "[Description]",
      })
    );
  }

  /**
   * Sets the accent color for the container.
   * @param color - The color to set as the accent, or `null` to clear the accent color.
   *                Accepts a value of type `ColorResolvable`.
   * @returns The current instance for method chaining.
   */
  public setColor(color: ColorResolvable | null): this {
    if (!color) return this.clearAccentColor();
    return this.setAccentColor(resolveColor(color));
  }

  /**
   * Sets the title for the container, trimming any leading or trailing whitespace.
   * Updates the content of the first TextDisplayBuilder component to reflect the new title, formatted as a Markdown heading.
   * @param title - The new title to set. If `null` or `undefined`, an empty string is used.
   * @returns The current instance for method chaining.
   */
  public setTitle(title?: string | null): this {
    this._title = title?.trim() ?? "";
    if (this.components[0] instanceof SectionBuilder) {
      return (
        (this.components[0].components[0] as TextDisplayBuilder).setContent(`### ${this._title}`) &&
        this
      );
    } else if (this.components[0] instanceof TextDisplayBuilder) {
      return this.components[0].setContent(`### ${this._title}`) && this;
    }

    return this;
  }

  /**
   * Sets the description of this embed using node `util.format()`.
   * @requires {@link FormatString `node:util.format()`}
   * @param description - A tuple of data to format (by `util.format()`) and set as the description.
   */
  setDescription(...description: any[]): this {
    const Formatted = FormatString(...description).trim();
    this._description = Formatted.match(/^(?:\s*|NaN|null|undefined)$/) ? "" : Formatted;
    if (this.components.length > 0 && this.components[0] instanceof SectionBuilder) {
      return (
        (this.components[0].components[1] as TextDisplayBuilder).setContent(this._description) &&
        this
      );
    } else if (this.components.length > 1 && this.components[1] instanceof TextDisplayBuilder) {
      return this.components[1].setContent(this._description) && this;
    }

    return this;
  }

  /**
   * Sets the footer text for the container. If a footer is provided, it trims the text,
   * updates the internal footer property, and adds separator and text display components
   * to the container. If `null` is provided, it removes the footer and associated components.
   * @param footer - The footer text to set, or `null` to remove the footer.
   * @returns The current instance for method chaining.
   */
  public setFooter(footer: string | null): this {
    if (this.components.length > 2) this.spliceComponents(-1, 2);
    if (!footer) {
      this._footer = null;
      return this;
    }

    this._footer = footer.trim();
    return this.addSeparatorComponents(
      new SeparatorBuilder({ divider: true })
    ).addTextDisplayComponents(
      new TextDisplayBuilder({
        content: `-# ${this._footer}`,
      })
    );
  }

  /**
   * Sets the thumbnail accessory for the container.
   * Accepts a `ThumbnailAccessory` instance, a URL string, or `null` to remove the thumbnail.
   * Restructures the container components based on whether a thumbnail is present.
   * @param accessory - The thumbnail to set. Can be a `ThumbnailAccessory`, a URL string, or `null` to remove the thumbnail.
   * @returns The current instance for method chaining.
   */
  public setThumbnail(accessory: ThumbnailAccessory | string | null): this {
    if (!accessory) {
      if (
        this._thumbnail === null &&
        !(this.components.length && this.components[0] instanceof SectionBuilder)
      ) {
        this._thumbnail = null;
        return this;
      }

      const Section = this.components[0] as SectionBuilder;
      const TitleDisplay = Section.components[0] as TextDisplayBuilder;
      const DescDisplay = Section.components[1] as TextDisplayBuilder;

      this.spliceComponents(0, 1, TitleDisplay, DescDisplay);
      this._thumbnail = null;
      return this;
    }

    const Thumb =
      typeof accessory === "string"
        ? new ThumbnailBuilder({
            media: {
              url: accessory,
              height: 45,
              width: 45,
            },
          })
        : accessory;

    this._thumbnail =
      typeof accessory === "string"
        ? accessory
        : "media" in accessory
          ? accessory.media.url
          : typeof accessory === "function"
            ? (accessory(new ThumbnailBuilder()).data.media?.url ?? null)
            : (accessory.data.media?.url ?? null);

    if (this.components.length > 0 && this.components[0] instanceof SectionBuilder) {
      this.components[0].setThumbnailAccessory(Thumb);
      return this;
    }

    if (
      this.components.length >= 2 &&
      this.components[0] instanceof TextDisplayBuilder &&
      this.components[1] instanceof TextDisplayBuilder
    ) {
      this.spliceComponents(
        0,
        2,
        new SectionBuilder()
          .addTextDisplayComponents(this.components[0], this.components[1])
          .setThumbnailAccessory(Thumb)
      );

      return this;
    }

    this.spliceComponents(0, this.components.length);
    const Section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder({
          content: `### ${this._title || "[Title]"}`,
        }),
        new TextDisplayBuilder({
          content: this._description || "[Description]",
        })
      )
      .setThumbnailAccessory(Thumb);

    this.addSectionComponents(Section);
    if (this._footer) {
      return this.setFooter(this._footer);
    }

    return this;
  }

  /**
   * Replies to a Discord interaction using the specified reply method, handling ephemeral and silent options.
   * @param interaction - The Discord interaction to reply to. Must be a `RepliableInteraction`.
   * @param ephemeral - Whether the reply should be ephemeral (visible only to the user). Defaults to `false`.
   * @param silent - If `true`, suppresses errors and returns `null` on failure. Defaults to `true`.
   * @param replyMethod - The reply method to use (`"reply"`, `"editReply"`, `"update"`, or `"followUp"`). If not provided, the method is determined automatically.
   * @returns A promise resolving to the interaction response or message, or `null` if silent and an error occurs.
   */
  async replyToInteract(
    interaction: RepliableInteraction,
    ephemeral: boolean = false,
    silent: boolean = true,
    replyMethod?: "reply" | "editReply" | "update" | "followUp"
  ): Promise<InteractionResponse<boolean> | Message<boolean>> {
    let ReplyMethod = replyMethod ?? "reply";
    const MsgFlags: MessageFlagsResolvable = ephemeral
      ? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      : MessageFlags.IsComponentsV2;

    if (
      !replyMethod &&
      (interaction instanceof CommandInteraction || interaction instanceof ButtonInteraction) &&
      (interaction.deferred || interaction.replied)
    ) {
      ReplyMethod = "editReply";
    }

    return interaction[ReplyMethod]({
      flags: MsgFlags,
      components: [this],
    })
      .catch(() => {
        if (ReplyMethod === "followUp") {
          return interaction.reply({
            flags: MsgFlags,
            components: [this],
          });
        } else if (
          ReplyMethod === "editReply" &&
          interaction instanceof MessageComponentInteraction &&
          !ephemeral
        ) {
          return interaction.update({
            flags: MsgFlags,
            components: [this],
          });
        } else {
          return interaction.followUp({
            flags: MsgFlags,
            components: [this],
          });
        }
      })
      .catch((err: UtilityTypes.Class<Error>) => {
        if (silent) return null;
        else throw err;
      });
  }
}

export class InfoContainer extends BaseExtraContainer {
  constructor() {
    super();
    this._title = "Information";
    this._accentColor = Colors.Info;
    this._description = "[Information Description]";

    this.setColor(this._accentColor).setTitle(this._title).setDescription(this._description);
  }

  /**
   * Uses the specified informative template and arguments to set the title and description.
   * @param templateName - The name of the info template to use.
   * @param args - Additional arguments to be used in formatting the info description.
   * @returns The modified instance of the info container.
   */
  useInfoTemplate(templateName: keyof typeof InfoMessages, ...args: any[]) {
    return ApplyContainerTemplate.call(this, "Info", templateName, ...args);
  }
}

export class WarnContainer extends BaseExtraContainer {
  constructor() {
    super();
    this._title = "Warning";
    this._accentColor = Colors.Warning;
    this._description = "[Warning Description]";

    this.setColor(this._accentColor).setTitle(this._title).setDescription(this._description);
  }
}

export class ErrorContainer extends BaseExtraContainer {
  constructor() {
    super();
    this._title = "Error";
    this._accentColor = Colors.Error;
    this._description = "[Error Description]";

    this.setColor(this._accentColor).setTitle(this._title).setDescription(this._description);
  }

  /**
   * Sets the footer of the error embed with the provided error Id.
   * @param ErrorId - The error Id to display in the footer.
   * @returns The modified instance of the error embed.
   */
  setErrorId(ErrorId: string): this {
    return this.setFooter(`Error ID: \`${ErrorId}\``);
  }

  /**
   * Uses the specified error object for the container's title and description.
   * @param {AppError | Error} Err - The error object to use.
   * @returns The modified instance of the error container.
   */
  useErrClass(Err: AppError | Error) {
    if (Err instanceof AppError) {
      this.setTitle(Err.title).setDescription(Err.message);
    } else {
      this.setTitle("Error").setDescription(Err.message);
    }
    return this;
  }

  /**
   * Uses the specified error template and arguments to set the title and description.
   * @param templateName - The name of the error template to use.
   * @param args - Additional arguments to be used in formatting the error description.
   * @returns The modified instance of the error container.
   */
  useErrTemplate(templateName: keyof typeof ErrorMessages, ...args: any[]): ErrorContainer {
    return ApplyContainerTemplate.call<
      ErrorContainer,
      ["Error", keyof typeof ErrorMessages, ...any[]],
      ErrorContainer
    >(this, "Error", templateName, ...args);
  }
}

export class SuccessContainer extends BaseExtraContainer {
  constructor() {
    super();
    this._title = "Success";
    this._accentColor = Colors.Success;
    this._description = "[Success Description]";

    this.setColor(this._accentColor).setTitle(this._title).setDescription(this._description);
  }

  /**
   * Uses the specified template and arguments to set the title and description.
   * @param templateName - The name of the template to use.
   * @param args - Additional arguments to be used in formatting the description.
   * @returns The modified instance of the success container.
   */
  useTemplate(templateName: keyof typeof InfoMessages, ...args: any[]): SuccessContainer {
    return ApplyContainerTemplate.call<
      SuccessContainer,
      ["Info", keyof typeof InfoMessages, ...any[]],
      SuccessContainer
    >(this, "Info", templateName, ...args);
  }
}

export class UnauthorizedContainer extends BaseExtraContainer {
  constructor() {
    super();
    this._title = "Unauthorized";
    this._accentColor = Colors.Error;
    this._description = "[Unauthorized Description]";

    this.setColor(this._accentColor).setTitle(this._title).setDescription(this._description);
  }

  /**
   * Uses the specified error template and arguments to set the title and description.
   * @param templateName - The name of the error template to use.
   * @param args - Additional arguments to be used in formatting the description.
   * @returns The modified instance of the unauthorized container.
   */
  useErrTemplate(templateName: keyof typeof ErrorMessages, ...args: any[]): UnauthorizedContainer {
    return ApplyContainerTemplate.call<
      UnauthorizedContainer,
      ["Error", keyof typeof ErrorMessages, ...any[]],
      UnauthorizedContainer
    >(this, "Error", templateName, ...args);
  }
}

/**
 * Applies a template to a Container instance based on the specified template type and name.
 * @template ToT - The type of template to use. Can be "Error", "Info", or "Any".
 * @param this - The Container instance to apply the template to.
 * @param TemplateOfType - The type of template to use. Determines which message group to use.
 * @param TemplateName - The name of the template to use. The available names depend on the template type.
 * @param args - Additional arguments to format the template description.
 * @returns The input Container instance with the applied template.
 */
function ApplyContainerTemplate<
  ToT extends "Error" | "Info" | "Any",
  This extends BaseExtraContainer = BaseExtraContainer,
>(
  this: This,
  TemplateOfType: ToT,
  TemplateName: ToT extends "Error"
    ? keyof typeof ErrorMessages
    : ToT extends "Info"
      ? keyof typeof InfoMessages
      : keyof typeof InfoMessages | keyof typeof ErrorMessages,
  ...args: any[]
): This {
  const TemplateCheckerRegex = /%[scdjifoO%]/;
  const MessageGroup =
    TemplateOfType === "Error"
      ? ErrorMessages
      : TemplateOfType === "Info"
        ? InfoMessages
        : { ...InfoMessages, ...ErrorMessages };

  const Thumbnail: string | null = Object.hasOwn((MessageGroup as any)[TemplateName], "Thumb")
    ? (MessageGroup as any)[TemplateName].Thumb || null
    : this._thumbnail || null;

  const AccentColor: ColorResolvable = Object.hasOwn((MessageGroup as any)[TemplateName], "Color")
    ? (MessageGroup as any)[TemplateName].Color
    : this._accentColor;

  if (TemplateOfType === "Error") {
    const ErrorMsg = ErrorMessages[TemplateName as keyof typeof ErrorMessages];
    if (ErrorMsg.Description.match(TemplateCheckerRegex)) {
      this.setTitle(ErrorMsg.Title).setDescription(FormatString(ErrorMsg.Description, ...args));
    } else {
      this.setTitle(ErrorMsg.Title).setDescription(ErrorMsg.Description);
    }
  } else if (TemplateOfType === "Info") {
    const InfoMsg = InfoMessages[TemplateName as keyof typeof InfoMessages];
    if (InfoMsg.Description.match(TemplateCheckerRegex)) {
      this.setTitle(InfoMsg.Title).setDescription(FormatString(InfoMsg.Description, ...args));
    } else {
      this.setTitle(InfoMsg.Title).setDescription(InfoMsg.Description);
    }
  } else if ((MessageGroup as any)[TemplateName].Description.match(TemplateCheckerRegex)) {
    this.setTitle((MessageGroup as any)[TemplateName].Title).setDescription(
      FormatString((MessageGroup as any)[TemplateName].Description, ...args)
    );
  } else {
    this.setTitle((MessageGroup as any)[TemplateName].Title).setDescription(
      (MessageGroup as any)[TemplateName].Description
    );
  }

  if (Thumbnail) {
    this.setThumbnail(Thumbnail);
  }

  return this.setColor(AccentColor);
}
