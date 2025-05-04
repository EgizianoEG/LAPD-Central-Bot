import { EmbedBuilder, GuildMember, SlashCommandSubcommandBuilder } from "discord.js";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import HandlePagePagination from "@Utilities/Other/HandleEmbedPagination.js";

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

async function Callback(CmdInteract: SlashCommandInteraction<"cached">) {
  const InputRegex = CmdInteract.options.getString("regex", true);
  const InputRFlag = CmdInteract.options.getString("flags", false);
  const RoleFilter = CmdInteract.options.getRole("role_filter", false);
  const ResponseEphemeral = CmdInteract.options.getBoolean("ephemeral", false) || false;

  try {
    const Regex = new RegExp(InputRegex, InputRFlag ?? undefined);
    const GuildMembers = await CmdInteract.guild.members.fetch();
    const MembersMatching = GuildMembers.filter((Member) => {
      return (
        !Member.user.bot &&
        (RoleFilter ? Member.roles.cache.has(RoleFilter.id) : true) &&
        Regex.test(Member.nickname ?? Member.displayName)
      );
    }).sort((M1, M2) =>
      (M1.nickname ?? M1.displayName).localeCompare(M2.nickname ?? M2.displayName)
    );

    const EmbedPages = ToEmbedPages(MembersMatching.toJSON());
    if (EmbedPages.length) {
      return HandlePagePagination({
        pages: EmbedPages,
        interact: CmdInteract,
        ephemeral: ResponseEphemeral,
        context: "Commands:Utility:Nickname:Search",
      });
    } else {
      return new InfoEmbed()
        .useInfoTemplate("NicknameRegexNoMatchingMembers")
        .replyToInteract(CmdInteract, true);
    }
  } catch (Err) {
    if (Err instanceof SyntaxError) {
      return new ErrorEmbed()
        .useErrTemplate("InvalidRegexSyntax")
        .replyToInteract(CmdInteract, true);
    }

    return new ErrorEmbed()
      .setDescription(
        "Seems like an unexpected error occurred while searching for members. Please try again later."
      )
      .replyToInteract(CmdInteract, true);
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
    .addRoleOption((Opt) =>
      Opt.setName("role_filter")
        .setDescription("Only search members in this role (optional).")
        .setRequired(false)
    )
    .addBooleanOption((Opt) =>
      Opt.setName("ephemeral")
        .setDescription("Whether to show the result in an ephemeral message or not.")
        .setRequired(false)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
