import GuildProfile from "@Models/GuildProfile.js";

/**
 * Checks if a given user is already logged in using the bot.
 * @param CmdInteraction - The user command interaction to process.
 * @returns Logged in Roblox user id. This value would be `0` if the user is not already logged in or hasn't been recognized.
 */
export default async function IsLoggedIn(CmdInteraction: SlashCommandInteraction): Promise<number> {
  const Member = await GuildProfile.findOne(
    {
      _id: CmdInteraction.user.id,
      guild: CmdInteraction.guildId,
    },
    { linked_account: 1 }
  ).exec();

  if (Member) {
    return Member.linked_account.roblox_user_id;
  }

  return 0;
}
