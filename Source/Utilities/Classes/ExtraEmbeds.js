const { format } = require("util");
const { EmbedBuilder } = require("discord.js");
const {
  Embeds: { Colors: EmbedColors, Thumbs: EmbedThumbs },
} = require("../../Config/Shared.js");
// ----------------------------------------------------------------

class BaseEmbed extends EmbedBuilder {
  /**
   * Sets the description of this embed.
   * @param {...any} description - A tuple of data to format (by `util.format()`) and set as the description
   * @returns {this}
   */
  setDescription(...description) {
    return super.setDescription(format(...description));
  }

  /**
   * Replies to a given *repliable* interaction with the current properties set
   * @param {import("discord.js").BaseInteraction & { replied: boolean }} interaction - The interaction to reply to
   * @param {Boolean} [ephemeral]
   * @returns {Promise<import("discord.js").InteractionResponse<boolean>> | Promise<import("discord.js").Message<boolean>>}
   */
  replyToInteract(interaction, ephemeral) {
    const ReplyMethod = interaction.replied ? "followUp" : "reply";
    return interaction[ReplyMethod]({
      ephemeral,
      embeds: [this],
    });
  }
}

class InfoEmbed extends BaseEmbed {
  /** @param {import("discord.js").EmbedData} [data] */
  constructor(data) {
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

class WarnEmbed extends BaseEmbed {
  /** @param {import("discord.js").EmbedData} [data] */
  constructor(data) {
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

class ErrorEmbed extends BaseEmbed {
  /** @param {import("discord.js").EmbedData} [data] */
  constructor(data) {
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

class SuccessEmbed extends BaseEmbed {
  /** @param {import("discord.js").EmbedData} [data] */
  constructor(data) {
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

class UnauthorizedEmbed extends BaseEmbed {
  /** @param {import("discord.js").EmbedData} [data] */
  constructor(data) {
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

// ----------------------------------------------------------------
module.exports = {
  InfoEmbed,
  WarnEmbed,
  ErrorEmbed,
  SuccessEmbed,
  UnauthorizedEmbed,
};
