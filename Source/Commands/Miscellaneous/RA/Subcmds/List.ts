import { SlashCommandSubcommandBuilder } from "discord.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  // ...basic callback logic...
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("list")
    .setDescription("Lists reduced activity records.")
    .addStringOption((Option) =>
      Option.setName("status")
        .setDescription(
          "The status of the RA records to be displayed, either active or pending; defaults to active."
        )
        .setRequired(false)
        .setChoices({ name: "Active", value: "Active" }, { name: "Pending", value: "Pending" })
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
