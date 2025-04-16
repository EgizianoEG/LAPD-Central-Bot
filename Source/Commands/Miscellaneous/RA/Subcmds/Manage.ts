import {
  SlashCommandSubcommandBuilder,
  time as FormatTime,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ComponentType,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  Message,
} from "discord.js";

import { ReducedActivityEventLogger } from "@Utilities/Classes/UANEventLogger.js";
import { UserActivityNotice } from "@Typings/Utilities/Database.js";
import { Embeds, Emojis } from "@Config/Shared.js";
import { ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import UserActivityNoticeModel from "@Models/UserActivityNotice.js";
import MentionCmdByName from "@Utilities/Other/MentionCmd.js";
import Dedent from "dedent";

type RADocument = UserActivityNotice.ActivityNoticeHydratedDocument;
const RAEventLogger = new ReducedActivityEventLogger();

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
function GetManagementComponents(ActiveOrPendingRA?: RADocument | null) {
  const ActionRow = new ActionRowBuilder<ButtonBuilder>();
  const CancelBtn = new ButtonBuilder()
    .setCustomId("ra-mng-cancel")
    .setStyle(ButtonStyle.Danger)
    .setEmoji(Emojis.WhiteCross)
    .setLabel("Cancel Pending Request");

  if (ActiveOrPendingRA?.status === "Pending") {
    ActionRow.addComponents(CancelBtn);
  }

  return ActiveOrPendingRA?.status === "Pending" ? [ActionRow] : [];
}

function GetManagementPromptEmbed(ActiveOrPendingRA?: RADocument | null) {
  const PromptEmbed = new EmbedBuilder()
    .setTitle("Reduced Activity Management")
    .setColor(Embeds.Colors.Info);

  if (ActiveOrPendingRA?.status === "Approved") {
    PromptEmbed.setColor(Embeds.Colors.LOARequestApproved).addFields({
      inline: true,
      name: "Active Notice",
      value: Dedent(`
      **Started:** ${FormatTime(ActiveOrPendingRA.review_date!, "D")}
      **Ends On:** ${FormatTime(ActiveOrPendingRA.end_date, "D")}
      **Quota Reduction:** ~${Math.round((ActiveOrPendingRA.quota_scale ?? 0) * 100)}%
      **Reason:** ${ActiveOrPendingRA.reason}
    `),
    });
  } else if (ActiveOrPendingRA?.status === "Pending") {
    PromptEmbed.setColor(Embeds.Colors.LOARequestPending).addFields({
      inline: true,
      name: "Pending Notice",
      value: Dedent(`
      **Requested:** ${FormatTime(ActiveOrPendingRA.request_date, "R")}
      **Starts On:** *once approved.*
      **Ends On:** around ${FormatTime(new Date(ActiveOrPendingRA.request_date.getTime() + ActiveOrPendingRA.duration), "D")}
      **Quota Reduction:** ~${Math.round((ActiveOrPendingRA.quota_scale ?? 0) * 100)}%
      **Reason:** ${ActiveOrPendingRA.reason}
    `),
    });
  } else {
    PromptEmbed.setDescription(
      `You currently do not have an active or pending reduced activity notice to manage.\nYou may request one using the ${MentionCmdByName(
        "ra request"
      )} command.`
    );
  }

  return PromptEmbed;
}

async function GetManagementEmbedAndRA(
  Interaction: SlashCommandInteraction<"cached"> | ButtonInteraction<"cached">
) {
  const ActiveOrPendingRA = await UserActivityNoticeModel.findOne({
    guild: Interaction.guildId,
    user: Interaction.user.id,
    type: "ReducedActivity",
    $or: [
      { status: "Pending", review_date: null },
      {
        status: "Approved",
        early_end_date: null,
        end_date: { $gt: Interaction.createdAt },
      },
    ],
  });

  const PromptEmbed = GetManagementPromptEmbed(ActiveOrPendingRA);
  return [PromptEmbed, ActiveOrPendingRA] as const;
}

async function HandlePendingCancellation(
  Interaction: ButtonInteraction<"cached">,
  ActiveOrPendingRA: RADocument,
  PromptMsgId: string
) {
  const ConfirmationEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Warning)
    .setTitle("Reduced Activity Cancellation")
    .setDescription(
      Dedent(`
        **Are you sure you want to cancel your reduced activity request?**
        You will not be able to request another reduced activity for the next hour if you proceed.
      `)
    );

  const ConfirmationBtns = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId("ra-cancel-confirm")
      .setStyle(ButtonStyle.Danger)
      .setLabel("Yes, Cancel Request"),
    new ButtonBuilder()
      .setCustomId("ra-cancel-keep")
      .setStyle(ButtonStyle.Secondary)
      .setLabel("No, Keep It")
  );

  const ConfirmationMsg = await Interaction.reply({
    withResponse: true,
    components: [ConfirmationBtns],
    embeds: [ConfirmationEmbed],
    flags: MessageFlags.Ephemeral,
  }).then((Resp) => Resp.resource!.message! as Message<true>);

  const ButtonInteract = await ConfirmationMsg.awaitMessageComponent({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === Interaction.user.id,
    time: 10 * 60_000,
  }).catch(() => null);

  if (!ButtonInteract || ButtonInteract.customId.includes("keep")) {
    if (ButtonInteract) {
      return ButtonInteract.deferUpdate()
        .then(() => ButtonInteract.deleteReply())
        .then(() => false)
        .catch(() => false);
    } else {
      return Interaction.deleteReply(ConfirmationMsg.id)
        .then(() => false)
        .catch(() => false);
    }
  } else {
    await ButtonInteract.deferUpdate();
  }

  const ExistingRA = await UserActivityNoticeModel.findById(ActiveOrPendingRA._id).exec();
  if (!ExistingRA) {
    return new ErrorEmbed()
      .useErrTemplate("NoPendingRAToCancel")
      .replyToInteract(ButtonInteract, true, true, "update");
  }

  ExistingRA.status = "Cancelled";
  ExistingRA.review_date = ButtonInteract.createdAt;
  await ExistingRA.save();

  const ReplyEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Success)
    .setTitle("Request Cancelled")
    .setDescription("Your reduced activity request was successfully cancelled.");

  await RAEventLogger.LogCancellation(ButtonInteract, ExistingRA);
  const UpdatedPromptEmbed = GetManagementPromptEmbed(ExistingRA);

  await ButtonInteract.editReply({ embeds: [ReplyEmbed], components: [] });
  return ButtonInteract.editReply({
    components: [],
    message: PromptMsgId,
    embeds: [UpdatedPromptEmbed],
  }).then(() => true);
}

// ---------------------------------------------------------------------------------------
// Initial Handling:
// -----------------
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  await Interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const [ReplyEmbed, ActiveOrPendingRA] = await GetManagementEmbedAndRA(Interaction);
  const ManagementComps = GetManagementComponents(ActiveOrPendingRA);
  const ReplyMsg = await Interaction.editReply({
    embeds: [ReplyEmbed],
    components: ManagementComps,
  });

  if (!ActiveOrPendingRA || ActiveOrPendingRA.status !== "Pending") return;
  const CompCollector = ReplyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 14 * 60_000,
    filter: (i) => i.user.id === Interaction.user.id,
  });

  CompCollector.on("collect", async (ButtonInteract) => {
    if (ButtonInteract.customId.includes("cancel")) {
      const RequestCancelled = await HandlePendingCancellation(
        ButtonInteract,
        ActiveOrPendingRA,
        ReplyMsg.id
      );

      if (RequestCancelled) {
        CompCollector.stop("Cancelled");
        return;
      }
    }
  });

  CompCollector.on("end", async (Collected, EndReason) => {
    if (EndReason.match(/^\w+Delete/) || EndReason === "Cancelled") return;
    ManagementComps[0]?.components.forEach((Btn) => Btn.setDisabled(true));
    const LastInteract = (Collected.last() as ButtonInteraction<"cached">) || Interaction;
    await LastInteract.editReply({ message: ReplyMsg.id, components: ManagementComps }).catch(
      () => null
    );
  });
}

// ---------------------------------------------------------------------------------------
// Command Structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("manage")
    .setDescription("Manage and view details of your active or pending reduced activity notice."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
