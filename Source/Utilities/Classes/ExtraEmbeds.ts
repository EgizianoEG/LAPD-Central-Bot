import {
  Message,
  EmbedData,
  EmbedBuilder,
  ColorResolvable,
  BaseInteraction,
  ButtonInteraction,
  CommandInteraction,
  InteractionResponse,
  MessageComponentInteraction,
} from "discord.js";

import { ErrorMessages, InfoMessages } from "@Resources/AppMessages.js";
import { format as FormatString } from "node:util";
import { Embeds } from "@Config/Shared.js";
import AppError from "./AppError.js";

const EmbedThumbs = Embeds.Thumbs;
const EmbedColors = Embeds.Colors;

class BaseEmbed extends EmbedBuilder {
  private static readonly ComponentRemovalRegex =
    /success(?:ful(?:ly)?)?|error|cancel(?:lation|l?ed)/i;

  /**
   * Sets the description of this embed using node `util.format()`.
   * @requires {@link FormatString `node:util.format()`}
   * @param description - A tuple of data to format (by `util.format()`) and set as the description.
   */
  setDescription(...description: any[]): this {
    const Formatted = FormatString(...description);
    return super.setDescription(Formatted.match(/^(?:\s*|NaN|null|undefined)$/) ? null : Formatted);
  }

  /**
   * Uses the specified error template and arguments to set the title and description of the error.
   * @param templateName - The name of the error template to use.
   * @param args - Additional arguments to be used in formatting the error description.
   * @returns The modified instance of the error embed.
   */
  useErrTemplate(templateName: keyof typeof ErrorMessages, ...args: any[]) {
    if (ErrorMessages[templateName].Description.match(/%[scdjifoO%]/)) {
      return super
        .setTitle(ErrorMessages[templateName].Title)
        .setDescription(FormatString(ErrorMessages[templateName].Description, ...args));
    } else {
      return super
        .setTitle(ErrorMessages[templateName].Title)
        .setDescription(ErrorMessages[templateName].Description);
    }
  }

  /**
   * Replies to a given *repliable* interaction with the current properties set.
   * @param interaction - The interaction to reply to.
   * @param ephemeral - Either `true` or `false`; whether the reply should be ephemeral (private); defaults to `false`.
   * @param silent - Whether to catch any errors that might occur and ignore them. Defaults to `true`.
   */
  async replyToInteract(
    interaction: BaseInteraction & { replied: boolean; reply; followUp; editReply },
    ephemeral: boolean = false,
    silent: boolean = true,
    replyMethod?: "reply" | "editReply" | "update" | "followUp"
  ): Promise<InteractionResponse<boolean> | Message<boolean>> {
    let ReplyMethod = replyMethod ?? "reply";
    let RemoveComponents: boolean = false;

    if (
      !replyMethod &&
      (interaction instanceof CommandInteraction || interaction instanceof ButtonInteraction) &&
      (interaction.deferred || interaction.replied)
    ) {
      ReplyMethod = "editReply";
    }

    // If the reply is about error messages, removing components of a message is necessary
    // (only if the reply method is 'edit' or 'editReply')
    if (
      this instanceof ErrorEmbed ||
      this.data.title?.match(BaseEmbed.ComponentRemovalRegex) ||
      this.data.description?.match(BaseEmbed.ComponentRemovalRegex) ||
      interaction.replied
    ) {
      RemoveComponents = true;
    }

    return interaction[ReplyMethod]({
      ephemeral,
      embeds: [this],
      content: RemoveComponents ? "" : undefined,
      components: RemoveComponents ? [] : undefined,
      files: RemoveComponents ? [] : undefined,
    })
      .catch(() => {
        if (ReplyMethod === "followUp") {
          return interaction.reply({
            ephemeral,
            embeds: [this],
          });
        } else if (
          ReplyMethod === "editReply" &&
          interaction instanceof MessageComponentInteraction &&
          !ephemeral
        ) {
          return interaction.update({
            embeds: [this],
          });
        } else {
          return interaction.followUp({
            ephemeral,
            embeds: [this],
          });
        }
      })
      .catch((err: UtilityTypes.Class<Error>) => {
        if (silent) return null;
        else throw err;
      });
  }
}

export class InfoEmbed extends BaseEmbed {
  constructor(data?: EmbedData) {
    super(data);
    this.setColor(EmbedColors.Info).setThumbnail(EmbedThumbs.Info);
    if (!this.data.description) {
      this.setDescription("[Information]");
    }
    if (!this.data.title) {
      this.setTitle("Information");
    }
  }

  /**
   * Uses the specified informative template and arguments to set the title and description of it.
   * @param templateName - The name of the info template to use.
   * @param args - Additional arguments to be used in formatting the info description.
   * @returns The modified instance of the info embed.
   */
  useInfoTemplate(templateName: keyof typeof InfoMessages, ...args: any[]) {
    const Thumbnail: string | null = Object.hasOwn(InfoMessages[templateName], "Thumb")
      ? (InfoMessages[templateName] as any).Thumb || null
      : this.data.thumbnail?.url || null;

    const EmbedColor: ColorResolvable = Object.hasOwn(InfoMessages[templateName], "Color")
      ? (InfoMessages[templateName] as any).Color
      : this.data.color;

    if (InfoMessages[templateName].Description.match(/%[scdjifoO%]/)) {
      return super
        .setTitle(InfoMessages[templateName].Title)
        .setColor(EmbedColor)
        .setDescription(FormatString(InfoMessages[templateName].Description, ...args))
        .setThumbnail(Thumbnail);
    } else {
      return super
        .setTitle(InfoMessages[templateName].Title)
        .setColor(EmbedColor)
        .setDescription(InfoMessages[templateName].Description)
        .setThumbnail(Thumbnail);
    }
  }
}

export class WarnEmbed extends BaseEmbed {
  constructor(data?: EmbedData) {
    super(data);
    this.setColor(EmbedColors.Warning).setThumbnail(EmbedThumbs.Warning);
    if (!this.data.description) {
      this.setDescription("[Warning]");
    }
    if (!this.data.title) {
      this.setTitle("Warning");
    }
  }
}

export class ErrorEmbed extends BaseEmbed {
  constructor(data?: EmbedData) {
    super(data);
    this.setColor(EmbedColors.Error).setThumbnail(EmbedThumbs.Error);
    if (!this.data.description) {
      this.setDescription("[Error Occurred]");
    }
    if (!this.data.title) {
      this.setTitle("Error");
    }
  }

  /**
   * Sets the footer of the error embed with the provided error Id.
   * @param ErrorId - The error Id to display in the footer.
   * @returns The modified instance of the error embed.
   */
  setErrorId(ErrorId: string): this {
    return this.setFooter({ text: `Error ID: ${ErrorId}` });
  }

  /**
   * Uses the specified error object for the embed's title and description.
   * @param {AppError | Error} Err - The error object to use.
   * @returns The modified instance of the error embed.
   */
  useErrClass(Err: AppError | Error) {
    if (Err instanceof AppError) {
      return this.setTitle(Err.title).setDescription(Err.message);
    } else {
      return this.setTitle("Error").setDescription(Err.message);
    }
  }
}

export class SuccessEmbed extends BaseEmbed {
  constructor(data?: EmbedData) {
    super(data);
    this.setColor(EmbedColors.Success).setThumbnail(EmbedThumbs.Success);
    if (!this.data.description) {
      this.setDescription("[Succeeded]");
    }
    if (!this.data.title) {
      this.setTitle("Success");
    }
  }
}

export class UnauthorizedEmbed extends BaseEmbed {
  constructor(data?: EmbedData) {
    super(data);
    this.setColor(EmbedColors.Error).setThumbnail(EmbedThumbs.Unauthorized);
    if (!this.data.description) {
      this.setDescription("[Unauthorized Action]");
    }
    if (!this.data.title) {
      this.setTitle("Unauthorized");
    }
  }
}
