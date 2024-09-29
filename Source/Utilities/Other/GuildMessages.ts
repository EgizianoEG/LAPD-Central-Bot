import AppLogger from "@Utilities/Classes/AppLogger.js";
import {
  DiscordAPIError,
  type MessagePayload,
  type ButtonInteraction,
  type MessageCreateOptions,
} from "discord.js";

/**
 * ...
 * @param StrList - String list (array) to sanitize (remove duplicates & validate snowflake).
 * @returns
 */
function SanitizeList(StrList: string[]): string[] {
  StrList = [...new Set(StrList)];
  const NewList: string[] = [];

  StrList.forEach((Str) => {
    if (!Str?.match(/^(?:\d{15,22}|\d{15,22}:\d{15,22})$/)) return;
    if (!Str.includes(":")) {
      const FoundItem = StrList.findIndex((Pred) => Pred.startsWith(Str));
      if (FoundItem) {
        return;
      }
    }
    NewList.push(Str);
  });

  return NewList;
}

/**
 * Sends messages to specific *joined* guilds and channels with a given message payload.
 * @param Interact - The originally received interaction from the user.
 * @param MsgPayload - The message payload to send over the provided channels.
 * @param GuildChannelIds - An array of strings or a single string representing guild and channel Ids in the format "GuildId:ChannelId" or "ChannelId".
 * 1. `Guild Id - Channel Id` format:
 * The string should be splittable by the `:` character and have both the guild id and the channel id where the message shall be sent.
 *
 * 2. `Channel Id` format:
 * The string should be the channel id where the message shall be sent. The guild id is retrieved from the interaction.
 * @returns A message link of the main sent message (where the interaction was initiated) or `null` if there was no main message sent (as if error occurred).
 * @notice
 * This function should not throw any errors occurring and just ignore them after logging.
 *
 * This function will ignore sending messages (to a guild/channel) if any of the following happens:
 *  - A provided guild is not available (or the bot is not a member of it)
 *  - A provided channel in a guild cannot be found (invisible to the bot)
 *  - The bot can't send messages in a provided channel (lack of perms)
 *  - An unexpected error occurred
 */
export async function SendGuildMessages(
  Interact: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">,
  GuildChannelIds: string | string[],
  MessagePayload: MessagePayload | MessageCreateOptions
) {
  let MainReportMsgLink: string | null = null;
  GuildChannelIds = SanitizeList(
    Array.isArray(GuildChannelIds) ? GuildChannelIds : [GuildChannelIds]
  );

  for (const GuildChannelId of GuildChannelIds) {
    let GuildId: string;
    let ChannelId: string;
    const Split = GuildChannelId.split(":");

    if (Split.length === 2) {
      [GuildId, ChannelId] = Split;
    } else {
      GuildId = Interact.guildId;
      ChannelId = GuildChannelId;
    }

    try {
      const Guild = Interact.client.guilds.cache.get(GuildId);
      if (!Guild) continue;

      const Channel = Guild.channels.cache.get(ChannelId);
      if (!Channel) continue;

      // Check if the channel is viewable, text-based, and the bot has permission to send messages
      const IsAbleToSendMsgs =
        Channel?.viewable &&
        Channel.isTextBased() &&
        Channel.permissionsFor(Interact.client.user.id)?.has(["SendMessages", "ViewChannel"]);

      if (IsAbleToSendMsgs) {
        const SentMsg = await Channel.send(MessagePayload);
        if (SentMsg && SentMsg.guildId === Interact.guildId) {
          MainReportMsgLink = SentMsg.url;
        }
      }
    } catch (Err: any) {
      if (Err instanceof DiscordAPIError && (Err.code === 10_003 || Err.code === 10_004)) continue;
      AppLogger.error({
        message: Err.message ?? "An error occurred while bulk-sending messages; ignoring..",
        label: "Utilities:Other:SendGuildMessages",
        stack: Err.stack,
      });
      continue;
    }
  }

  return MainReportMsgLink;
}
