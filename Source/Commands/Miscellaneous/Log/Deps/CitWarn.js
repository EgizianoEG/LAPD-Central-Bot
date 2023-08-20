const { SlashCommandSubcommandBuilder, ApplicationCommandOptionType } = require("discord.js");

const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("citation-warning")
    .setDescription("Creates a warning citation record for a person.")

    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The username of the violator.")
        .setRequired(true)
        .setMaxLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
    )
    .addStringOption((Option) =>
      Option.setName("reason")
        .setDescription("The reason of the given fine.")
        .setMinLength(5)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-plate")
        .setDescription("The license plate of the cited person's vehicle.")
        .setMinLength(3)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-model")
        .setDescription("The cited person's vehicle model.")
        .setMinLength(5)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-color")
        .setDescription("The cited person's vehicle color.")
        .setMinLength(3)
        .setRequired(true)
    ),
};

CommandObject.data.type = ApplicationCommandOptionType.Subcommand;

// ----------------------------------------------------------------
module.exports = CommandObject;
