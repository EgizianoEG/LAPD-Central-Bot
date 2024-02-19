// Dependencies:
// -------------

import { Colors, channelLink, EmbedBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import MSRolesModel from "@Models/MemberRoles.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(CmdInteraction: SlashCommandInteraction<"cached">) {
  const SelectedMember = CmdInteraction.options.getMember("member");
  const SaveId = CmdInteraction.options.getString("save", true);
  const Save = await MSRolesModel.findById(SaveId);

  if (!SelectedMember) {
    return new ErrorEmbed()
      .useErrTemplate("MemberNotFound")
      .replyToInteract(CmdInteraction, true, false);
  } else if (Save && Save.member !== SelectedMember.id) {
    return new ErrorEmbed()
      .useErrTemplate("RolesSaveNotFoundFSM")
      .replyToInteract(CmdInteraction, true, false);
  } else if (!Save) {
    return new ErrorEmbed()
      .useErrTemplate("RolesSaveNotFoundFD")
      .replyToInteract(CmdInteraction, true, false);
  }

  await CmdInteraction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Member Roles Load     @${SelectedMember.user.username}`)
        .setDescription("Assigning saved roles...")
        .setColor(Colors.Greyple),
    ],
  });

  const CurrentRoles = SelectedMember.roles.cache;
  const FilteredRoles = Save.roles.filter((Role) => {
    return (
      CmdInteraction.guild.roles.comparePositions(
        CmdInteraction.guild.members.me!.roles.highest,
        Role.role_id
      ) >= 0
    );
  });

  const RolesAfter = (
    await SelectedMember.roles.add(
      FilteredRoles.map((Role) => Role.role_id),
      `Roles save load; by @${CmdInteraction.user.username}`
    )
  ).roles.cache;

  const AssignedRoles = RolesAfter.size - CurrentRoles.size;
  const UnassignedRoles = Save.roles.filter((Role) => {
    return !RolesAfter.has(Role.role_id);
  }).length;

  const RespEmbedDesc = Dedent(`
    - **Save Loaded:** \`${Save.id}\`
      - **Save Roles:** **[${Save.roles.length}](${channelLink(CmdInteraction.channelId)})**
      - **Assigned Roles:** **[${AssignedRoles}](${channelLink(CmdInteraction.channelId)})**
      - **Unassigned Roles:** **[${UnassignedRoles}](${channelLink(CmdInteraction.channelId)})**
  `);

  return CmdInteraction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Member Roles Reassigned     @${SelectedMember.user.username}`)
        .setDescription(RespEmbedDesc)
        .setColor(Colors.Greyple),
    ],
  }).catch(() => null);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("load")
    .setDescription(
      "Assigns previously saved roles to a member. This action doesn't delete any of the current roles."
    )
    .addUserOption((Option) =>
      Option.setName("member")
        .setDescription("The member to save their roles for.")
        .setRequired(true)
    )
    .addStringOption((Option) =>
      Option.setName("save")
        .setMinLength(24)
        .setMaxLength(24)
        .setRequired(true)
        .setAutocomplete(true)
        .setDescription(
          "The save to load. Type a date, nickname, username, or save ID to see autocomplete options."
        )
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
