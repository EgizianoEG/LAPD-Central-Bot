import { ButtonInteraction } from "discord.js";
import GuildProfile from "@Models/GuildProfile.js";

/**
 * Checks if a given user is already logged in using the bot.
 * @param SearchData - The user command interaction or a plain object containing the user id and guild id.
 * @returns Logged in Roblox user id. This value would be `0` if the user is not already logged in or hasn't been recognized.
 */
export default async function IsLoggedIn(
  SearchData:
    | SlashCommandInteraction<"cached">
    | ButtonInteraction<"cached">
    | {
        user: { id: string };
        guildId: string;
      }
): Promise<number> {
  const Profile = await GuildProfile.findOne(
    {
      user_id: SearchData.user.id,
      guild: SearchData.guildId,
    },
    { linked_account: 1 }
  ).exec();

  if (Profile) {
    return Profile.linked_account.roblox_user_id;
  }

  return 0;
}
