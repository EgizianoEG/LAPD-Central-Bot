const { format } = require("util");
const { EmbedBuilder } = require("discord.js");
const {
  Embeds: { Colors: EmbedColors, Thumbs: EmbedThumbs },
} = require("../../Json/Shared.json");
// ----------------------------------------------------------------

class InfoEmbed extends EmbedBuilder {
  constructor(description = "Information") {
    super();
    this.setColor(parseInt(EmbedColors.Info, 16))
      .setThumbnail(EmbedThumbs.Info)
      .setTitle("Information")
      .setDescription(format(description));
  }

  /**
   * Sets the description of this embed.
   * @param {any} description The description to use (will be formatted with `util.format`)
   * @returns
   */
  setDescription() {
    return super.setDescription(format(...arguments));
  }
}

class WarnEmbed extends EmbedBuilder {
  constructor(description = "Warning") {
    super();
    this.setColor(parseInt(EmbedColors.Warning, 16))
      .setThumbnail(EmbedThumbs.Warning)
      .setTitle("Warning")
      .setDescription(format(description));
  }

  /**
   * Sets the description of this embed.
   * @param {any} description The description to use (will be formatted with `util.format`)
   * @returns
   */
  setDescription() {
    return super.setDescription(format(...arguments));
  }
}

class ErrorEmbed extends EmbedBuilder {
  constructor(description = "Error occurred") {
    super();
    this.setColor(parseInt(EmbedColors.Error, 16))
      .setThumbnail(EmbedThumbs.Error)
      .setTitle("Error")
      .setDescription(format(description));
  }

  /**
   * Sets the description of this embed.
   * @param {any} description The description to use (will be formatted with `util.format`)
   * @returns
   */
  setDescription() {
    return super.setDescription(format(...arguments));
  }
}

class SuccessEmbed extends EmbedBuilder {
  constructor(description = "Success") {
    super();
    this.setColor(parseInt(EmbedColors.Success, 16))
      .setThumbnail(EmbedThumbs.Success)
      .setTitle("Success")
      .setDescription(format(description));
  }

  /**
   * Sets the description of this embed.
   * @param {any} description The description to use (will be formatted with `util.format`)
   * @returns
   */
  setDescription() {
    return super.setDescription(format(...arguments));
  }
}

class UnauthorizedEmbed extends EmbedBuilder {
  constructor(description = "Unauthorized action") {
    super();
    this.setColor(parseInt(EmbedColors.Error, 16))
      .setThumbnail(EmbedThumbs.Unauthorized)
      .setTitle("Unauthorized")
      .setDescription(format(description));
  }

  /**
   * Sets the description of this embed.
   * @param {any} description The description to use (will be formatted with `util.format`)
   * @returns
   */
  setDescription() {
    return super.setDescription(format(...arguments));
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
