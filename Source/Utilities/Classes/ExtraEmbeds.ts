import {
  Message,
  EmbedBuilder,
  EmbedData,
  BaseInteraction,
  InteractionResponse,
  CommandInteraction,
} from "discord.js";
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
   * Replies to a given *repliable* interaction with the current properties set.
   * @param interaction - The interaction to reply to.
   * @param ephemeral - Either `true` or `false`; whether the reply should be ephemeral (private); defaults to `false`.
   */
  replyToInteract(
    interaction: BaseInteraction & { replied: boolean; reply; followUp; editReply },
    ephemeral: boolean = false
  ): Promise<InteractionResponse<boolean>> | Promise<Message<boolean>> {
    let ReplyMethod: "reply" | "editReply" | "followUp" = "reply";

    if (interaction instanceof CommandInteraction && interaction.deferred)
      ReplyMethod = "editReply";
    else if (interaction.replied) ReplyMethod = "followUp";

    return interaction[ReplyMethod]({
      ephemeral,
      embeds: [this],
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
