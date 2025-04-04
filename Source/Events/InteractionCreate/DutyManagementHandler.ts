import { ButtonInteraction, BaseInteraction } from "discord.js";

import { ErrorEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  GetShiftManagementButtons,
  ShiftMgmtActions,
} from "@Cmds/Miscellaneous/Duty/Subcmds/Manage.js";
import UserHasPerms, { UserHasPermsV2 } from "@Utilities/Database/UserHasPermissions.js";
import { Guilds, Shifts } from "@Typings/Utilities/Database.js";

import { Types } from "mongoose";
import GetGuildSettings from "@Utilities/Database/GetGuildSettings.js";
import ShiftModel from "@Models/Shift.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetShiftActive from "@Utilities/Database/GetShiftActive.js";

type HydratedShiftDocument = Shifts.HydratedShiftDocument;
const FileLabel = "Events:InteractionCreate:DutyManagementHandler";
const DutyShiftActionRegex = new RegExp(`^(?:${Object.values(ShiftMgmtActions).join("|")})`, "i");
const FunctionMap = {
  [ShiftMgmtActions.ShiftOn]: HandleShiftStart,
  [ShiftMgmtActions.ShiftOff]: HandleShiftEnd,
  [ShiftMgmtActions.ShiftBreakToggle]: HandleShiftBreak,
};

// -----------------------------------------------------------------------------------------------------
// Initial Handling:
// -----------------
export default async function DutyManagementHandler(
  _: DiscordClient,
  Interaction: BaseInteraction
) {
  if (!Interaction.isButton() || !Interaction.inCachedGuild()) return;
  if (!Interaction.customId.match(DutyShiftActionRegex)) return;
  if (await HandleUnauthorizedShiftManagement(Interaction)) return;
  const [ShiftAction, , TargetShiftType] = Interaction.customId.split(":") as [
    string,
    string,
    string,
    string?,
  ];

  const SelectedShiftActionFunction = FunctionMap[ShiftAction as keyof typeof FunctionMap];
  const ShiftActive = await GetShiftActive({
    Interaction,
    UserOnly: true,
    ShiftType: TargetShiftType,
  });

  if (SelectedShiftActionFunction) {
    if (!Interaction.deferred) await Interaction.deferUpdate();
    if (ShiftActive) {
      await SelectedShiftActionFunction(Interaction, ShiftActive as any);
    } else {
      await SelectedShiftActionFunction(Interaction, TargetShiftType as any);
    }
  }
}

// -----------------------------------------------------------------------------------------------------
// Shift Management Handlers:
// --------------------------
async function HandleShiftStart(Interaction: ButtonInteraction<"cached">, ShiftType: string) {}

async function HandleShiftBreak(
  Interaction: ButtonInteraction<"cached">,
  ShiftActive: HydratedShiftDocument
) {}

async function HandleShiftEnd(
  Interaction: ButtonInteraction<"cached">,
  ShiftActive: HydratedShiftDocument
) {}

async function HandleShiftBreakOn(
  Interaction: ButtonInteraction<"cached">,
  ShiftActive: HydratedShiftDocument
) {}

async function HandleShiftBreakOff(
  Interaction: ButtonInteraction<"cached">,
  ShiftActive: HydratedShiftDocument
) {}

// -----------------------------------------------------------------------------------------------------
// Helper Functions:
// -----------------

/**
 * Handles unauthorized shift management interactions triggered by a button press.
 * This function validates the interaction to ensure the user has the necessary permissions
 * and that the shift type being managed adheres to the guild's configuration.
 *
 * @param Interaction - The button interaction object with a cached user and guild.
 * @returns A promise that resolves to `true` if the interaction was unauthorized and handled,
 *          or `false` if the interaction was valid and no further action is required.
 *
 * The function performs the following checks:
 * 1. Verifies if the interaction was triggered by the same user who initiated it.
 * 2. Checks if the user has the required permissions to manage shifts.
 * 3. Ensures the guild's settings are available for validation.
 * 4. Validates if the targeted shift type is authorized for the user.
 *
 * If any of these checks fail, an appropriate error or unauthorized embed is sent as
 * a response to the interaction with no further processing is required.
 */
async function HandleUnauthorizedShiftManagement(Interaction: ButtonInteraction<"cached">) {
  const [, TriggeringUserId, TargettedShiftType] = Interaction.customId.split(":");
  if (TriggeringUserId !== Interaction.user.id) {
    return new UnauthorizedEmbed()
      .useErrTemplate("UnauthorizedInteraction")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }

  const IsUserAuthorized = await UserHasPermsV2(Interaction.user.id, Interaction.guildId, {
    staff: true,
  });

  if (!IsUserAuthorized) {
    await DisableManagementButtons(Interaction);
    return new UnauthorizedEmbed()
      .useErrTemplate("UnauthorizedCmdUsage")
      .replyToInteract(Interaction, true, true, "followUp")
      .then(() => true);
  }

  const GuildSettings = await GetGuildSettings(Interaction.guildId);
  if (!GuildSettings) {
    return new ErrorEmbed()
      .useErrTemplate("GuildConfigNotFound")
      .replyToInteract(Interaction, true)
      .then(() => true);
  }

  const IsAuthorizedShiftTypeUsage = await CheckShiftTypeRestrictions(
    Interaction,
    GuildSettings.shift_management.shift_types,
    TargettedShiftType
  );

  if (!IsAuthorizedShiftTypeUsage) {
    await DisableManagementButtons(Interaction);
    return new UnauthorizedEmbed()
      .useErrTemplate("UnauthorizedShiftTypeUsage")
      .replyToInteract(Interaction, true, true, "followUp")
      .then(() => true);
  }

  return false;
}

/**
 * Handles the validation of shift type restrictions and checks whether the user has permission to use a specific shift type.
 * @param Interaction - The received command interaction.
 * @param GuildShiftTypes - The created shift types of the interaction's guild.
 * @param CmdShiftType - The user requested/received shift type.
 * @returns A boolean value. `true` if the user has permission to use the shift type, `false` otherwise.
 */
async function CheckShiftTypeRestrictions(
  Interaction: ButtonInteraction<"cached">,
  GuildShiftTypes: Types.DocumentArray<Guilds.ShiftType>,
  CmdShiftType?: string | null
) {
  const IsGuildDefaultType = GuildShiftTypes.find((ShiftType) => ShiftType.is_default);
  const DesiredShiftType = GuildShiftTypes.find((ShiftType) => ShiftType.name === CmdShiftType);

  if (!CmdShiftType && !IsGuildDefaultType) return true;
  if (CmdShiftType?.toLowerCase() === "default") return true;

  // Side Note: users with management permissions shall be able to use any shift type.
  const UserHasMgmtPerms = await UserHasPerms(Interaction, {
    management: { guild: true, app: true, $or: true },
  });

  if (UserHasMgmtPerms) return true;
  if (CmdShiftType && DesiredShiftType) {
    return Interaction.member.roles.cache.hasAny(...DesiredShiftType.access_roles);
  } else if (IsGuildDefaultType) {
    return Interaction.member.roles.cache.hasAny(...IsGuildDefaultType.access_roles);
  }

  return false;
}

/**
 * Disables all buttons in the interaction's message to prevent further misuse or repeated attempts.
 * @param Interaction - The button interaction object.
 * @param [Silent=true] - Optional parameter to determine if the update should be silent in errors (no error outputs/throws). Defaults to `true`.
 * @returns A promise that resolves to the updated interaction message or `null` if silent.
 * @notice This function should be called when the interaction is not deferred or replied to yet so that
 *         it can use the `update` method on the prompt interaction.
 */
async function DisableManagementButtons(
  Interaction: ButtonInteraction<"cached">,
  Silent: boolean = true
) {
  if (Interaction.deferred || Interaction.replied || !Interaction.message?.editable) return;
  const DisabledMgmtComponents = GetShiftManagementButtons(Interaction, null, null).updateButtons({
    end: false,
    start: false,
    break: false,
  });

  return Interaction.update({
    components: [DisabledMgmtComponents],
  }).catch((Err) => {
    if (Silent) return null;
    throw Err;
  });
}
