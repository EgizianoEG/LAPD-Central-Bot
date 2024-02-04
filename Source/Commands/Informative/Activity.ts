import { SlashCommandBuilder } from "discord.js";
import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
// ---------------------------------------------------------------------------------------

/**
 * Officer activity show command
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction) {
  await Interaction.deferReply();

  return Interaction.editReply({ embeds: [] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandWithOptions> = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Shows general activity information of an officer.")
    .setDMPermission(false)
    .addUserOption((Option) =>
      Option.setName("officer")
        .setDescription("The officer to show activity information for.")
        .setRequired(true)
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
