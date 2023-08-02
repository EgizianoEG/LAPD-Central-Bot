// eslint-disable-next-line no-unused-vars
const { Client, ModalSubmitInteraction } = require("discord.js");

/**
 * @param {Client} Client
 * @param {ModalSubmitInteraction} Interaction
 */
module.exports = async (Client, Interaction) => {
  if (
    !Interaction.isModalSubmit() ||
    !Client.modalCallbacks ||
    !Client.modalCallbacks.has(Interaction.customId)
  ) {
    // return;
  }

  // if (!Command) {
  //   console.log(`ModalHandler - No command matching "${Interaction.commandName}" was found.`);
  //   return;
  // }

  // try {
  //   if (typeof Command.modalHandler == "function") {
  //     await Command.modalHandler(Interaction);
  //   } else {
  //     throw new Error(
  //       `Modal handling failed for command "${CommandName}" as there was no modal handler function found for it.`
  //     );
  //   }
  // } catch (Error) {
  //   console.log(
  //     `ModalHandler - Something went wrong while executing command "${Interaction.commandName}" autocomplete function. Error: ${Error.message}`
  //   );
  // }
};
