import {
  SlashCommandSubcommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ComponentType,
  EmbedBuilder,
  ButtonStyle,
  userMention,
  channelLink,
  Colors,
} from "discord.js";

import { Emojis } from "@Config/Shared.js";
import { ErrorEmbed, InfoEmbed, SuccessEmbed, WarnEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import Dedent from "dedent";
const RegexFlags = ["i", "g", "gi"];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
function GetConfirmationPromptComponents(CmdInteraction: SlashCommandInteraction<"cached">) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-nickname-replace:${CmdInteraction.user.id}:${CmdInteraction.guildId}`)
        .setLabel("Confirm and Replace All")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`cancel-nickname-replace:${CmdInteraction.user.id}:${CmdInteraction.guildId}`)
        .setLabel("Cancel Replacement")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const InputRegex = Interaction.options.getString("regex", true);
  const InputRFlag = Interaction.options.getString("flags", false);
  const InputReplacement = Interaction.options.getString("replacement", true);

  try {
    const MatchRegex = new RegExp(InputRegex, InputRFlag || undefined);
    const GuildMembers = await Interaction.guild.members.fetch();
    const MembersMatching = GuildMembers.filter((Member) => {
      return (Member.nickname ?? Member.displayName).match(MatchRegex)?.every((M) => !!M);
    });

    if (MembersMatching.size === 0) {
      return new InfoEmbed()
        .useInfoTemplate("NicknameRegexNoMatchingMembers")
        .replyToInteract(Interaction, true);
    }

    const Replacements = MembersMatching.map((Member) => {
      return {
        member: Member,
        original: Member.nickname ?? Member.displayName,
        replaced: (Member.nickname ?? Member.displayName).replace(MatchRegex, InputReplacement),
      };
    });

    const ReplacementSample = Replacements.slice(0, 4)
      .map((Rep) => `${userMention(Rep.member.id)}: \`${Rep.original}\` → \`${Rep.replaced}\``)
      .join(`\n${" ".repeat(12)}- `);

    const ConfirmationEmbed = new WarnEmbed()
      .setTitle("Confirmation Required")
      .setFooter({
        text: "This will be automatically cancelled after five minutes of no response.",
      })
      .setDescription(
        Dedent(`
          **Are you certain you want to replace all \
          [${MembersMatching.size}](${channelLink(Interaction.channelId)}) \
          nicknames matching the regex \`${InputRegex}\` with \`${InputReplacement}\`?**
          
          **Please keep in mind that:**
          - This action will not affect users with a role position higher than the application's highest role.
          - This is an irreversible action that will replace any nicknames that match this regex, as demonstrated by the examples below:
            - ${ReplacementSample}
        `)
      );

    const ConfirmationPrompt = await Interaction.reply({
      embeds: [ConfirmationEmbed],
      components: GetConfirmationPromptComponents(Interaction),
      withResponse: true,
    });

    const ButtonInteract = await ConfirmationPrompt.resource
      ?.message!.awaitMessageComponent({
        filter: (BI) => HandleCollectorFiltering(Interaction, BI),
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000,
      })
      .catch((Err) => HandleActionCollectorExceptions(Err, ConfirmationPrompt));

    if (ButtonInteract?.customId.includes("confirm")) {
      let FinalRespEmbed: EmbedBuilder;
      let TotalReplaced = 0;
      let TotalFailed = 0;

      await ButtonInteract.update({
        components: [],
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.DarkGrey)
            .setTitle(`${Emojis.LoadingGrey}\u{2000}Replacing Nicknames`)
            .setDescription(
              "Kindly wait. Matching nicknames are currently being modified, which may take some time."
            ),
        ],
      });

      await Promise.allSettled(
        Replacements.map(async ({ member, replaced }) => {
          try {
            await member.setNickname(
              replaced,
              `Automated Nickname Replacement - Executed By @${ButtonInteract.user.username}`
            );
            return TotalReplaced++;
          } catch {
            return TotalFailed++;
          }
        })
      );

      if (TotalReplaced === 0) {
        FinalRespEmbed = new ErrorEmbed()
          .setTitle("Replacement Failed")
          .setDescription(
            "The application couldn't replace any nicknames that matched the provided criteria. This could be due to factors such as role position or insufficient permissions."
          );
      } else {
        FinalRespEmbed = new SuccessEmbed()
          .setTitle("Success")
          .setDescription(
            `Successfully replaced and modified ${TotalReplaced} out of ${MembersMatching.size} matching nicknames.`
          );
      }

      return ButtonInteract.editReply({
        embeds: [FinalRespEmbed],
        components: [],
      });
    }

    if (ButtonInteract?.customId.includes("cancel")) {
      return ButtonInteract.update({
        components: [],
        embeds: [
          new InfoEmbed()
            .setTitle("Replacement Cancelled")
            .setDescription("The nickname replacement process was cancelled."),
        ],
      });
    }
  } catch (Err) {
    if (Err instanceof SyntaxError) {
      return new ErrorEmbed()
        .useErrTemplate("InvalidRegexSyntax")
        .replyToInteract(Interaction, true);
    }

    return new ErrorEmbed()
      .setDescription("Seems like an error occurred while doing nickname replacement for members.")
      .replyToInteract(Interaction, true);
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("replace")
    .setDescription(
      "Change and modify nicknames of all members based on an ECMAScript regular expression."
    )
    .addStringOption((Opt) =>
      Opt.setName("regex")
        .setDescription("The regex to match nicknames with.")
        .setMinLength(2)
        .setMaxLength(35)
        .setRequired(true)
    )
    .addStringOption((Opt) =>
      Opt.setName("replacement")
        .setDescription("The replacement string or expression.")
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
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
