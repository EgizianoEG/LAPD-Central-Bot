import {
  Message,
  EmbedBuilder,
  EmbedData,
  BaseInteraction,
  InteractionResponse,
  CommandInteraction,
  ButtonInteraction,
} from "discord.js";
import { ErrorMessages, InfoMessages } from "@Resources/AppMessages.js";
import { format as FormatString } from "node:util";
import SharedConfig from "@Config/Shared.js";

const EmbedThumbs = SharedConfig.Embeds.Thumbs;
const EmbedColors = SharedConfig.Embeds.Colors;

class BaseEmbed extends EmbedBuilder {
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
    return super
      .setTitle(ErrorMessages[templateName].Title)
      .setDescription(FormatString(ErrorMessages[templateName].Description, ...args));
  }

  /**
   * Uses the specified informative template and arguments to set the title and description of it.
   * @param templateName - The name of the info template to use.
   * @param args - Additional arguments to be used in formatting the info description.
   * @returns The modified instance of the info embed.
   */
  useInfoTemplate(templateName: keyof typeof InfoMessages, ...args: any[]) {
    return super
      .setTitle(InfoMessages[templateName].Title)
      .setDescription(FormatString(InfoMessages[templateName].Description, ...args));
  }

  /**
   * Replies to a given *repliable* interaction with the current properties set.
   * @param interaction - The interaction to reply to.
   * @param ephemeral - Either `true` or `false`; whether the reply should be ephemeral (private); defaults to `false`.
   * @param silent - Whether to catch any errors that might occur and ignore them.
   */
  replyToInteract(
    interaction: BaseInteraction & { replied: boolean; reply; followUp; editReply },
    ephemeral: boolean = false,
    silent?: boolean
  ): Promise<InteractionResponse<boolean>> | Promise<Message<boolean>> {
    let ReplyMethod: "reply" | "editReply" | "followUp" = "reply";
    let RemoveComponents: boolean = false;

    if (interaction instanceof CommandInteraction && interaction.deferred)
      ReplyMethod = "editReply";
    else if (interaction instanceof ButtonInteraction && interaction.deferred)
      ReplyMethod = "editReply";
    else if (interaction.replied) ReplyMethod = "followUp";

    // If the reply is about error messages, removing components of a message is necessary
    // (only if the reply method is 'edit' or 'editReply')
    if (this.data.description?.match(/error/) || this.data.title?.match(/error/)) {
      RemoveComponents = true;
    }

    return interaction[ReplyMethod]({
      ephemeral,
      embeds: [this],
      content: RemoveComponents ? "" : undefined,
      components: RemoveComponents ? [] : undefined,
      files: RemoveComponents ? [] : undefined,
    }).catch((err: UtilityTypes.Class<Error>) => {
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
