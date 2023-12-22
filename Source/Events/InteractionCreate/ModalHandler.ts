import { BaseInteraction, Client } from "discord.js";

/**
 * @param Client
 * @param Interaction
 */
export default async function (Client: Client, ModalInteract: BaseInteraction) {
  if (!ModalInteract.isModalSubmit()) return;

  const ModalListener = Client.modalListeners.get(ModalInteract.customId);
  if (ModalListener && typeof ModalListener === "function") {
    return ModalListener(ModalInteract);
  }
}
