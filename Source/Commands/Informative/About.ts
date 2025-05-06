import Humanizer from "humanize-duration";
import { IsValidDiscordId } from "@Utilities/Other/Validators.js";
import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { Discord } from "@Config/Secrets.js";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  SlashCommandBuilder,
  OAuth2Scopes,
} from "discord.js";

const ListFormatter = new Intl.ListFormat("en");
const AppAuthorId = "560396280497438731";
const RepoURL = "https://github.com/EgizianoEG/LAPD-Central-App";
// ---------------------------------------------------------------------------------------

/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {
  await Interaction.deferReply();

  const SupportServer = Client.guilds.cache.get(Discord.SupportGuildId || "000");
  const SServerInvite =
    SupportServer?.invites.cache.find((Invite) => Invite.inviterId === Client.user.id) ??
    (await SupportServer?.invites
      .create(SupportServer.rulesChannelId ?? SupportServer.afkChannelId ?? "000")
      .catch(() => null));

  const AppDevsJoined = ListFormatter.format(
    Discord.DeveloperIds.filter((Id) => IsValidDiscordId(Id) && Id !== AppAuthorId).map(
      (Id) => `<@${Id}>`
    )
  );

  const RunningAppVersion = process.env.version ?? process.env.npm_package_version ?? "[Unknown]";
  const AppInviteLink = Client.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: [
      "AttachFiles",
      "ManageRoles",
      "SendMessages",
      "ManageNicknames",
      "UseExternalEmojis",
    ],
  });

  const AppUptime = Humanizer(Client.uptime, {
    conjunction: " and ",
    largest: 3,
    round: true,
  });

  const ResponseEmbed = new InfoEmbed()
    .setTitle("About LAPD Central")
    .setDescription(
      "A discord.js bot designed to assist in the management and operation of role-playing ER:LC LAPD Discord servers. Inspired by: ERM, Trident, Robo, and more."
    )
    .addFields({
      name: "Author",
      value: `<@${AppAuthorId}>`,
      inline: true,
    })
    .addFields({
      name: "Version",
      value: RunningAppVersion,
      inline: true,
    })
    .addFields({
      name: "Uptime",
      value: `around ${AppUptime}`,
      inline: true,
    })
    .addFields({
      name: "App Invite",
      value: `[Invite Link](${AppInviteLink})`,
      inline: true,
    })
    .addFields({
      name: "Support Server",
      value: SServerInvite?.url ? `[Invite Link](${SServerInvite.url})` : "[Unavailable]",
      inline: true,
    })
    .addFields({
      name: "Github",
      value: `[Repository Link](${RepoURL})`,
      inline: true,
    });

  if (AppDevsJoined.length) {
    ResponseEmbed.addFields({
      name: "Contributors",
      value: AppDevsJoined,
      inline: false,
    });
  }

  return Interaction.editReply({ embeds: [ResponseEmbed] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Provides information about the application.")
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
