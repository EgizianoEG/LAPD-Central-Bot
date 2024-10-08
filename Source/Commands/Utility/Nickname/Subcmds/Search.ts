import { EmbedBuilder, GuildMember, SlashCommandSubcommandBuilder } from "discord.js";
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
  const MMTotal = Members.length;

  for (let i = 0; i < Members.length; i += 20) {
    Embeds.push(
      new InfoEmbed()
        .setTitle(`Matching Members — ${MMTotal}`)
        .setDescription(
          ListFormatter.format(Members.slice(i, i + 20).map((M) => `<@${M.user.id}>`))
        )
    );
  }

  return Embeds;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const InputRegex = Interaction.options.getString("regex", true);
  const InputRFlag = Interaction.options.getString("flags", false);
  const ResponseEphemeral = Interaction.options.getBoolean("ephemeral", false) || false;

  try {
    const Regex = new RegExp(InputRegex, InputRFlag || undefined);
    const GuildMembers = await Interaction.guild.members.fetch();
    const MembersMatching = GuildMembers.filter((Member) => {
      return Regex.test(Member.nickname ?? Member.displayName);
    }).sort((M1, M2) =>
      (M1.nickname ?? M1.displayName).localeCompare(M2.nickname ?? M2.displayName)
    );

    const EmbedPages = ToEmbedPages(MembersMatching.toJSON());
    if (EmbedPages.length) {
      return HandleEmbedPagination(
        EmbedPages,
        Interaction,
        "Commands:Utility:Nickname:Search",
        ResponseEphemeral
      );
    } else {
      return new InfoEmbed()
        .useInfoTemplate("NicknameRegexNoMatchingMembers")
        .replyToInteract(Interaction, true);
    }
  } catch {
    return new ErrorEmbed()
      .setDescription("Seems like an error occurred while searching for members.")
      .replyToInteract(Interaction, true);
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("search")
    .setDescription(
      "Look up server members by their nicknames using an ECMAScript regular expression."
    )
    .addStringOption((Opt) =>
      Opt.setName("regex")
        .setDescription("The regex to match nicknames with.")
        .setMinLength(2)
        .setMaxLength(35)
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
    )
    .addBooleanOption((Opt) =>
      Opt.setName("ephemeral")
        .setDescription("Whether to show the result in an ephemeral message or not.")
        .setRequired(false)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
