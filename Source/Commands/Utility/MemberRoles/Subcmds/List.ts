// Dependencies:
// -------------

import { Colors, EmbedBuilder, SlashCommandSubcommandBuilder, channelLink, time } from "discord.js";
import { HydratedDocumentFromSchema } from "mongoose";
import { ErrorEmbed, InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandlePagePagination from "@Utilities/Other/HandleEmbedPagination.js";
import MSRolesModel from "@Models/MemberRoles.js";
import Chunks from "@Utilities/Other/SliceIntoChunks.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Returns an array of embed pages containing information about the role backups for a specified user.
 * @param RoleSaves - An array of hydrated documents from the MSRolesModel schema. Each document represents a role save.
 * @param InteractDate - A `Date` that represents the date when the interaction was made. For clarifying when was this data fetched.
 * @param MemberUsername - The username of a target/selected member.
 * @returns an array of EmbedBuilder objects.
 */
function GetSavePages(
  RoleSaves: HydratedDocumentFromSchema<typeof MSRolesModel.schema>[],
  CmdInteraction: SlashCommandInteraction<"cached">,
  MemberUsername: string
) {
  const EmbedPages: EmbedBuilder[] = [];
  const SaveChunks = Chunks(RoleSaves, 3);

  for (const SaveChunk of SaveChunks) {
    const Data: string[] = [];

    SaveChunk.forEach((Save) => {
      Data.push(
        Dedent(`
          - **Save ID:** \`${Save.id}\`
            - **Saved By:** <@${Save.saved_by}>
            - **Saved On:** ${time(Save.saved_on, "f")}
            - **Save Role Count:** [${Save.roles.length}](${channelLink(CmdInteraction.channelId)})
        `)
      );
    });

    EmbedPages.push(
      new EmbedBuilder()
        .setTitle(`Role Backups     @${MemberUsername}`)
        .setDescription(Data.join("\n\n"))
        .setTimestamp(CmdInteraction.createdAt)
        .setColor(Colors.Greyple)
    );
  }

  return EmbedPages;
}

async function Callback(CmdInteraction: SlashCommandInteraction<"cached">) {
  const SelectedMember = CmdInteraction.options.getMember("member");
  if (!SelectedMember) {
    return new ErrorEmbed()
      .useErrTemplate("MemberNotFound")
      .replyToInteract(CmdInteraction, true, false);
  }

  const Saves = await MSRolesModel.find({
    guild: CmdInteraction.guildId,
    member: SelectedMember.id,
  })
    .sort({ saved_at: "desc" })
    .exec();

  if (Saves.length === 0) {
    return new InfoEmbed()
      .useInfoTemplate("RoleSavesNotFoundFSM")
      .replyToInteract(CmdInteraction, true, false);
  } else {
    return HandlePagePagination({
      pages: GetSavePages(Saves, CmdInteraction, SelectedMember.user.username),
      interact: CmdInteraction,
    });
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("list")
    .setDescription("Lists all saves for a member's roles.")
    .addUserOption((Option) =>
      Option.setName("member")
        .setDescription("The member to list their role saves.")
        .setRequired(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
