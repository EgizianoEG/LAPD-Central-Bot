// -------------
// Dependencies:
// ------------------------------------------------------------------------------------

import {
  SlashCommandSubcommandBuilder,
  ActionRowBuilder,
  ComponentType,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";

import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { Emojis, Embeds } from "@Config/Shared.js";

import Util from "node:util";
import Dedent from "dedent";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetShiftTypes from "@Utilities/Database/GetShiftTypes.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";

const Clamp = (Value: number, Min: number, Max: number) => Math.min(Math.max(Value, Min), Max);
const ListFormatter = new Intl.ListFormat("en");
const DisplayedShiftTypesPerPage = 3;

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Returns a formatted string from a given shift type data
 * @param ShiftTypeData - An array of shift types to format
 * @returns A formatted string to be set as an embed description
 */
function FormatEmbedDescription(ShiftTypeData: Utilities.Database.GuildShiftType[]): string {
  const Formatted: string[] = [];
  for (const ShiftType of ShiftTypeData) {
    const Template = Dedent(`
        **Name:** \`%s\`
        **Default Type:** \`%s\`
        **Permissible Roles:**
        > %s
    `);

    const ShiftTypeDesc = Util.format(
      Template + "\n\n",
      ShiftType.name,
      ShiftType.is_default ? "Yes" : "No",
      ShiftType.permissible_roles.length
        ? ListFormatter.format(ShiftType.permissible_roles.map((RoleId) => `<@&${RoleId}>`))
        : "*Usable by All Staff Identified Members*"
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
  ShiftTypesData: Utilities.Database.GuildShiftType[],
  ShiftTypesPerPage: number
): EmbedBuilder[] {
  const SegmentedData: Utilities.Database.GuildShiftType[][] = [];
  const Pages: EmbedBuilder[] = [];

  if (ShiftTypesData.length) {
    for (let Index = 0; Index < ShiftTypesData.length; Index += ShiftTypesPerPage) {
      const Data = ShiftTypesData.slice(Index, Index + ShiftTypesPerPage);
      SegmentedData.push(Data);
    }

    for (const Segment of SegmentedData) {
      const EmbedPage = new EmbedBuilder()
        .setColor(Colors.DarkBlue)
        .setThumbnail(Embeds.Thumbs.Info)
        .setTitle("Created Duty Shift Types")
        .setDescription(FormatEmbedDescription(Segment));
      Pages.push(EmbedPage);
    }
  } else {
    Pages.push(
      new InfoEmbed()
        .setTitle("No Created Duty Shift Types")
        .setDescription(
          "This server has no created duty shift types. There is only the default shift type of the application."
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
 *
 * @execution
 * 1. Retrieve duty shift type data from the database for the current guild.
 * 2. Format data into embed pages using CreateEmbedPages function.
 * 3. If only one page, send it as a response and end.
 * 4. Set up a collector for navigation buttons to handle interactions.
 * 5. Process user interactions, updating the display as needed.
 * 6. When the collector ends, disable navigation buttons and clean up.
 * 7. Log errors for debugging.
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const GuildShiftTypes = await GetShiftTypes(Interaction.guildId);
  const Pages = CreateEmbedPages(GuildShiftTypes, DisplayedShiftTypesPerPage);
  let CurrPageIndex = 0;

  // Early return if there is no need for pagination (when there is only one page available)
  if (Pages.length === 1) {
    return Interaction.reply({
      embeds: [Pages[0]],
    });
  }

  const NavButtonsActionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("first")
      .setEmoji(Emojis.NavFirst)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("prev")
      .setEmoji(Emojis.NavPrev)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("current")
      .setLabel("Page: 1/" + Pages.length)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder().setCustomId("next").setEmoji(Emojis.NavNext).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("last").setEmoji(Emojis.NavLast).setStyle(ButtonStyle.Primary)
  ) as ActionRowBuilder<ButtonBuilder & { data: { custom_id?: string } }>;

  NavButtonsActionRow.components.forEach((Comp) =>
    Comp.setCustomId(`${Comp.data.custom_id}:${Interaction.user.id}`)
  );

  const InteractReply = await Interaction.reply({
    embeds: [Pages[0]],
    components: [NavButtonsActionRow],
    fetchReply: true,
  });

  const NavActionCollector = InteractReply.createMessageComponentCollector({
    filter: (ButtonInteract) => HandleCollectorFiltering(Interaction, ButtonInteract),
    componentType: ComponentType.Button,
    time: 10 * 60_000,
  });

  /**
   * Updates the disabled state of the navigation buttons
   * @param ButtonsToEnable
   * - A map where keys are the buttons to set its state ("first", "last", "next", and "prev")
   * and values are the disabled state (A boolean value).
   */
  const UpdateButtons = (ButtonsToEnable: { [key: string]: boolean }) => {
    const ButtonMap = { first: 0, last: 4, next: 3, prev: 1 };
    NavButtonsActionRow.components[2].setLabel(`Page: ${CurrPageIndex + 1}/${Pages.length}`);
    for (const [Name, Enabled] of Object.entries(ButtonsToEnable)) {
      NavButtonsActionRow.components[ButtonMap[Name]].setDisabled(!Enabled);
    }
  };

  NavActionCollector.on("collect", async (NavInteraction) => {
    await NavInteraction.deferUpdate();
    switch (NavInteraction.customId) {
      case "next":
        CurrPageIndex = Clamp(CurrPageIndex + 1, 0, Pages.length);
        break;
      case "prev":
        CurrPageIndex = Clamp(CurrPageIndex - 1, 0, Pages.length);
        break;
      case "last":
        CurrPageIndex = Pages.length - 1;
        break;
      case "first":
      default:
        CurrPageIndex = 0;
        break;
    }

    UpdateButtons({
      first: CurrPageIndex !== 0,
      last: CurrPageIndex !== Pages.length - 1,
      prev: CurrPageIndex !== 0,
      next: CurrPageIndex !== Pages.length - 1,
    });

    InteractReply.edit({
      embeds: [Pages[CurrPageIndex]],
      components: [NavButtonsActionRow],
    });
  });

  NavActionCollector.on("end", (_, Reason) => {
    NavActionCollector.removeAllListeners();
    if (Reason.match(/\w+Delete/)) return;

    try {
      NavButtonsActionRow.components.forEach((Btn) => Btn.setDisabled(true));
      InteractReply.edit({ components: [NavButtonsActionRow] });
    } catch (Err: any) {
      AppLogger.error({
        message: "Could not query '%s' username;",
        label: "Command:DutyTypes:View",
        stack: Err.stack,
        details: { ...Err },
      });
    }
  });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("view")
    .setDescription("Lists all present server-created duty types."),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
