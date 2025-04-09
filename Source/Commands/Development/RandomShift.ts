import ShiftModel from "@Models/Shift.js";
import {
  codeBlock,
  MessageFlags,
  SlashCommandBuilder,
  InteractionContextType,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

// ---------------------------------------------------------------------------------------

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const Shift = await ShiftModel.countDocuments({ guild: Interaction.guildId }).then((Count) => {
    const RandomNum = Math.floor(Math.random() * Count);
    return ShiftModel.findOne().skip(RandomNum).exec();
  });

  if (Shift) {
    return Interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: codeBlock("json", JSON.stringify(Shift.toJSON({ getters: true }), null, 2)),
    });
  } else {
    return Interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "There are no recorded shifts.",
    });
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
