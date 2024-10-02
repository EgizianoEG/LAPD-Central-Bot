import { Guilds } from "@Typings/Utilities/Database.js";
import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { SlashCommandSubcommandBuilder, EmbedBuilder, Colors } from "discord.js";

import HandleEmbedPagination from "@Utilities/Other/HandleEmbedPagination.js";
import GetShiftTypes from "@Utilities/Database/GetShiftTypes.js";
import Dedent from "dedent";
import Util from "node:util";

const ListFormatter = new Intl.ListFormat("en");
const DisplayedShiftTypesPerPage = 2;

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Returns a formatted string from a given shift type data
 * @param ShiftTypeData - An array of shift types to format
 * @returns A formatted string to be set as an embed description
 */
function FormatEmbedDescription(ShiftTypeData: Guilds.ShiftType[]): string {
  const Formatted: string[] = [];

  for (const ShiftType of ShiftTypeData) {
    const Template = Dedent(`
        **Name:** \`%s\`
        **Default Type:** %s
        **Access Roles** [%i]**:**
        > %s
    `);

    const ShiftTypeDesc = Util.format(
      Template + "\n\n",
      ShiftType.name,
      ShiftType.is_default ? "Yes" : "No",
      ShiftType.access_roles.length,
      ShiftType.access_roles.length
        ? ListFormatter.format(ShiftType.access_roles.map((RoleId) => `<@&${RoleId}>`))
        : "*Usable by all identified staff members*"
    );

    Formatted.push(ShiftTypeDesc);
  }

  return Formatted.join("");
}

/**
 * Returns an array of embeds representing pages of shift types
 * @param ShiftTypesData Raw shift types data containing names and permissible roles
 * @param ShiftTypesPerPage How many shift types to include in a single embed (page)?
 * @returns An array of embeds representing pages of shift types
 */
function CreateEmbedPages(
  ShiftTypesData: Guilds.ShiftType[],
  ShiftTypesPerPage: number
): EmbedBuilder[] {
  const SegmentedData: Guilds.ShiftType[][] = [];
  const Pages: EmbedBuilder[] = [];

  if (ShiftTypesData.length) {
    for (let Index = 0; Index < ShiftTypesData.length; Index += ShiftTypesPerPage) {
      const Data = ShiftTypesData.slice(Index, Index + ShiftTypesPerPage);
      SegmentedData.push(Data);
    }

    for (const Segment of SegmentedData) {
      const EmbedPage = new EmbedBuilder()
        .setColor(Colors.DarkBlue)
        .setTitle("Created Duty Shift Types")
        .setDescription(FormatEmbedDescription(Segment));

      Pages.push(EmbedPage);
    }
  } else {
    Pages.push(
      new InfoEmbed()
        .setTitle("No Custom Types Found")
        .setDescription(
          "This server has no created duty shift types. There is only the default shift type available for use."
        )
    );
  }

  return Pages;
}

/**
 * Handles the command execution process for displaying all available duty shift types.
 * @param _ - The Discord.js client instance (not used in this function)
 * @param Interaction - The user command interaction
 * @description
 * Handles the logic for displaying a paginated list of all available duty shift types.
 * It retrieves shift type data from the database, formats it into embed pages, and sets up a collector
 * for navigation buttons to paginate through the embed pages.
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  await Interaction.deferReply({ ephemeral: true });
  const GuildShiftTypes = await GetShiftTypes(Interaction.guildId);
  const Pages = CreateEmbedPages(GuildShiftTypes, DisplayedShiftTypesPerPage);

  return HandleEmbedPagination(Pages, Interaction);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("view")
    .setDescription("Lists all present server-created duty types."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
