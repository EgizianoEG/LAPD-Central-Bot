const { EmbedBuilder } = require("discord.js");
const {
  Embeds: { Colors: EmbedColors, Thumbs: EmbedThumbs },
} = require("../../Json/Shared.json");

class InfoEmbed extends EmbedBuilder {
  constructor(description = "Information") {
    super();
    this.setColor(parseInt(EmbedColors.Info, 16))
      .setThumbnail(EmbedThumbs.Info)
      .setTitle("Information")
      .setDescription(description);
  }
}

class WarnEmbed extends EmbedBuilder {
  constructor(description = "Warning") {
    super();
    this.setColor(parseInt(EmbedColors.Warning, 16))
      .setThumbnail(EmbedThumbs.Warning)
      .setTitle("Warning")
      .setDescription(description);
  }
}

class ErrorEmbed extends EmbedBuilder {
  constructor(description = "Error occurred") {
    super();
    this.setColor(parseInt(EmbedColors.Error, 16))
      .setThumbnail(EmbedThumbs.Error)
      .setTitle("Error")
      .setDescription(description);
  }
}

class SuccessEmbed extends EmbedBuilder {
  constructor(description = "Success") {
    super();
    this.setColor(parseInt(EmbedColors.Success, 16))
      .setThumbnail(EmbedThumbs.Success)
      .setTitle("Success")
      .setDescription(description);
  }
}

class UnauthorizedEmbed extends EmbedBuilder {
  constructor(description = "Unauthorized action") {
    super();
    this.setColor(parseInt(EmbedColors.Error, 16))
      .setThumbnail(EmbedThumbs.Unauthorized)
      .setTitle("Unauthorized")
      .setDescription(description);
  }
}

module.exports = {
  InfoEmbed,
  WarnEmbed,
  ErrorEmbed,
  SuccessEmbed,
  UnauthorizedEmbed,
};
