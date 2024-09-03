import ShiftModel from "@Models/Shift.js";
import Dedent from "dedent";
import {
  SlashCommandBuilder,
  InteractionContextType,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

// ---------------------------------------------------------------------------------------
/**
 * @param Client
 * @param Interaction
 */
async function Callback(Interaction: SlashCommandInteraction) {
  const Shift = await ShiftModel.countDocuments({ guild: Interaction.guildId }).then((count) => {
    const ran_num = Math.floor(Math.random() * count);
    return ShiftModel.findOne().skip(ran_num).exec();
  });

  if (Shift) {
    return Interaction.reply({
      ephemeral: true,
      content: Dedent`
        \`\`\`json
        ${JSON.stringify(Shift.toJSON({ getters: true }), null, 2)}
        \`\`\`
      `,
    });
  } else {
    return Interaction.reply({ ephemeral: true, content: "There are no recorded shifts." });
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  callback: Callback,
  options: { dev_only: true },
  data: new SlashCommandBuilder()
    .setName("random-shift")
    .setContexts(InteractionContextType.Guild)
    .setDescription("Shows a random previously recorded shift."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
