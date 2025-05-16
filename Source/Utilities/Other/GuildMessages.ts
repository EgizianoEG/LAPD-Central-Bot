import AppLogger from "@Utilities/Classes/AppLogger.js";
import {
  type Message,
  type MessagePayload,
  type ButtonInteraction,
  type MessageCreateOptions,
  type ModalSubmitInteraction,
  type ForumThreadChannel,
  PermissionFlagsBits,
  DiscordAPIError,
} from "discord.js";

/**
 * Sends a message payload to one or more specified guild channels or threads.
 * @param Interact - The cached interaction object.
 * @param FormattedIds - A single formatted channel/thread identifier or an array of such identifiers. Each identifier can be in the format:
 *   - "GuildId:ChannelId"
 *   - "GuildId:ChannelId:ThreadId"
 *   - "ChannelId" (uses the guild ID from the interaction)
 * @param MessagePayload - The message payload to send, which can be a MessagePayload or MessageCreateOptions object.
 * @returns A promise that resolves to the main sent message (if any was sent in the interaction's guild), or null if no message was sent.
 * @remarks
 * - The function sanitizes and normalizes the list of IDs before processing.
 * - For each ID, it attempts to fetch the corresponding guild, channel, and optionally thread.
 * - It checks for appropriate permissions before sending messages.
 * - If a thread ID is provided, it attempts to send the message to the thread if possible.
 * - If not a thread or thread is not sendable, it attempts to send the message to the channel.
 * - Only the URL of the message sent in the interaction's guild is returned.
 * - Errors related to missing access or unknown channels/threads are silently ignored; other errors are logged.
 */
export async function SendGuildMessages(
  Interact:
    | SlashCommandInteraction<"cached">
    | ButtonInteraction<"cached">
    | ModalSubmitInteraction<"cached">,
  FormattedIds: string | string[],
  MessagePayload: MessagePayload | MessageCreateOptions
): Promise<Message<true> | null> {
  FormattedIds = SanitizeList(Array.isArray(FormattedIds) ? FormattedIds : [FormattedIds]);

  // Prepare all send attempts as promises
  const SendPromises = FormattedIds.map(async (FormattedId) => {
    let GuildId: string;
    let ChannelId: string;
    let ThreadId: string | null = null;
    const Split = FormattedId.split(":");

    if (Split.length === 2) {
      [GuildId, ChannelId] = Split;
    } else if (Split.length === 3) {
      [GuildId, ChannelId, ThreadId] = Split;
      ThreadId = ThreadId ?? null;
    } else if (Split.length === 1) {
      GuildId = Interact.guildId;
      ChannelId = FormattedId;
    } else {
      return null;
    }

    try {
      const Guild = Interact.client.guilds.cache.get(GuildId);
      if (!Guild) return null;

      const Channel = Guild.channels.cache.get(ChannelId);
      if (!Channel) return null;

      let Thread: ForumThreadChannel | null = null;
      if (ThreadId && Channel.isThreadOnly()) {
        Thread = await Channel.threads.fetch(ThreadId);
        if (!Thread) return null;
      } else if (ThreadId) {
        return null;
      }

      if (
        Thread?.isSendable() &&
        Thread.permissionsFor(Interact.client.user.id)?.has([
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ViewChannel,
        ])
      ) {
        const SentMsg = await Thread.send(MessagePayload);
        if (SentMsg && SentMsg.guildId === Interact.guildId) {
          return SentMsg;
        }
        return null;
      }

      // Check if the channel is viewable, text-based, and the bot has permission to send messages
      const IsAbleToSendMsgs =
        Channel?.viewable &&
        Channel.isTextBased() &&
        Channel.permissionsFor(Interact.client.user.id)?.has([
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ViewChannel,
        ]);

      if (IsAbleToSendMsgs) {
        const SentMsg = await Channel.send(MessagePayload);
        if (SentMsg && SentMsg.guildId === Interact.guildId) {
          return SentMsg;
        }
      }
      return null;
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && (Err.code === 10_003 || Err.code === 10_004))
        return null;
      AppLogger.error({
        message: "An error occurred while bulk-sending messages; ignoring..",
        label: "Utilities:Other:SendGuildMessages",
        stack: Err.stack,
      });
      return null;
    }
  });

  const SendResults = await Promise.allSettled(SendPromises);
  if (SendResults[0]?.status === "fulfilled" && SendResults[0]?.value) {
    return SendResults[0].value;
  }

  return null;
}

/**
 * Removes duplicate strings from the input list and filters the list to include only valid ID patterns.
 * @param StrList - The array of strings to sanitize.
 * @returns A new array containing only unique and valid strings according to the specified rules.
 */
function SanitizeList(StrList: string[]): string[] {
  StrList = [...new Set(StrList)];
  return StrList.filter((Str) => Str?.match(/^(?:\d{15,22})(?::\d{15,22}){0,2}$/)).sort((A, B) => {
    const AColons = (A.match(/:/g) || []).length;
    const BColons = (B.match(/:/g) || []).length;

    if (AColons !== BColons) {
      return AColons - BColons;
    }

    return A.localeCompare(B);
  });
}
