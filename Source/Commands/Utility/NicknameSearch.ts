import { EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import HandleEmbedPagination from "@Utilities/Other/HandleEmbedPagination.js";

const ListFormatter = new Intl.ListFormat("en");
const RegexFlags = ["i", "g", "gi"];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Takes an array of GuildMembers and returns an array of EmbedBuilders, where each EmbedBuilder contains a subset of the GuildMembers in a formatted list.
 * @param {GuildMember[]} Members - An array of GuildMember objects, representing the members of a guild.
 * @returns an array of EmbedBuilder objects.
 */
function ToEmbedPages(Members: GuildMember[]) {
  const Embeds: EmbedBuilder[] = [];
  for (let i = 0; i < Members.length; i += 20) {
    Embeds.push(
      new InfoEmbed()
        .setTitle("Matching Members")
        .setDescription(
          ListFormatter.format(Members.slice(i, i + 20).map((M) => `<@${M.user.id}>`))
        )
    );
  }
  return Embeds;
}

/**
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const InputRegex = Interaction.options.getString("regex", true);
  const InputRFlag = Interaction.options.getString("flags", false);

  try {
    const Regex = new RegExp(InputRegex, InputRFlag || undefined);
    const GuildMembers = await Interaction.guild.members.fetch();
    const MembersMatching = GuildMembers.filter((Member) => {
      return Regex.test(Member.nickname ?? Member.displayName);
    });

    const EmbedPages = ToEmbedPages(MembersMatching.toJSON());
    if (EmbedPages.length) {
      return HandleEmbedPagination(EmbedPages, Interaction);
    } else {
      return new InfoEmbed()
        .setTitle("Matching Members")
        .setDescription("There were no members found with that nickname regex.")
        .replyToInteract(Interaction);
    }
  } catch (Err) {
    return new ErrorEmbed()
      .setDescription("Seems like an error occurred while searching for members.")
      .replyToInteract(Interaction, true, true);
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<any> = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("nickname-search")
    .setDMPermission(false)
    .setDescription(
      "Look up server member(s) by their nickname(s) using an ECMAScript regular expression."
    )
    .addStringOption((Opt) =>
      Opt.setName("regex")
        .setDescription("The regex to match nicknames with.")
        .setMinLength(2)
        .setMaxLength(30)
        .setRequired(true)
    )
    .addStringOption((Opt) =>
      Opt.setName("flags")
        .setDescription("The regex flag(s) to use.")
        .setRequired(false)
        .setChoices(
          ...RegexFlags.map((F) => {
            return { name: F, value: F };
          })
        )
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;