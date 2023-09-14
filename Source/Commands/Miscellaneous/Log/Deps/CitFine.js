const { SlashCommandSubcommandBuilder } = require("discord.js");

const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("citation-fine")
    .setDescription("Creates a fine citation record for a person.")

    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The username of the violator.")
        .setRequired(true)
        .setMaxLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
    )
    .addIntegerOption((Option) =>
      Option.setName("fine-amount")
        .setDescription("The amount of the fine in dollars.")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200)
    )
    .addStringOption((Option) =>
      Option.setName("reason")
        .setDescription("The reason of the given cite.")
        .setMinLength(5)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-plate")
        .setDescription("The license plate of the cited person's vehicle.")
        .setMinLength(3)
        .setMaxLength(7)
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-model")
        .setDescription("The cited person's vehicle model.")
        .setMinLength(5)
        .setMaxLength(100)
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((Option) =>
      Option.setName("vehicle-color")
        .setDescription("The cited person's vehicle color.")
        .setMinLength(3)
        .setMaxLength(15)
        .setRequired(true)
        .setAutocomplete(true)
    ),
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
