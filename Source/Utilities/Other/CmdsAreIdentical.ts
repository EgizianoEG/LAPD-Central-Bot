import { ContextMenuCommandBuilder } from "discord.js";
import type {
  ApplicationCommand,
  ApplicationCommandOptionType,
  APIApplicationCommandBooleanOption,
  APIApplicationCommandChannelOption,
  APIApplicationCommandIntegerOption,
  APIApplicationCommandNumberOption,
  APIApplicationCommandOptionBase,
  APIApplicationCommandRoleOption,
  APIApplicationCommandUserOption,
  APIApplicationCommandStringOption,
  APIApplicationCommandOptionChoice,
  APIApplicationCommandAttachmentOption,
  APIApplicationCommandSubcommandOption,
  APIApplicationCommandSubcommandGroupOption,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  APIApplicationCommandOptionWithAutocompleteOrChoicesWrapper,
} from "discord.js";

type SlashCommandOptions = (
  | APIApplicationCommandOptionWithAutocompleteOrChoicesWrapper<
      APIApplicationCommandOptionBase<ApplicationCommandOptionType>,
      APIApplicationCommandOptionChoice<string | number>
    >
  | APIApplicationCommandAttachmentOption
  | APIApplicationCommandSubcommandGroupOption
  | APIApplicationCommandSubcommandOption
  | APIApplicationCommandBooleanOption
  | APIApplicationCommandChannelOption
  | APIApplicationCommandIntegerOption
  | APIApplicationCommandStringOption
  | APIApplicationCommandRoleOption
  | APIApplicationCommandUserOption
  | APIApplicationCommandNumberOption
)[];

/**
 * Validates two slash commands if they are semi-equal in properties and values
 * @param Cmd_1 - The first slash command to compare
 * @param Cmd_2 - The second slash command to compare
 * @returns
 */
export default function CmdsAreEqual(
  Cmd_1: ApplicationCommand,
  Cmd_2: SlashCommandObject | ContextMenuCommandObject
): boolean {
  if (Cmd_2.data instanceof ContextMenuCommandBuilder) {
    return ContextMenuCommandsAreIdentical(Cmd_1, Cmd_2 as ContextMenuCommandObject);
  }

  const Cmd_Data_1 = Cmd_1.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody;
  const Cmd_Data_2 = Cmd_2.data.toJSON();

  return !(
    Cmd_Data_1.description !== Cmd_Data_2.description ||
    Cmd_Data_1.options?.length !== (Cmd_Data_2.options?.length ?? 0) ||
    AreSlashCommandOptionsDifferent(Cmd_Data_1.options, Cmd_Data_2.options ?? [])
  );
}

function AreSlashCommandOptionChoicesDifferent(
  ExistingChoices: APIApplicationCommandOptionWithAutocompleteOrChoicesWrapper<
    APIApplicationCommandOptionBase<ApplicationCommandOptionType>,
    APIApplicationCommandOptionChoice<string | number>
  >["choices"],
  LocalChoices: APIApplicationCommandOptionWithAutocompleteOrChoicesWrapper<
    APIApplicationCommandOptionBase<ApplicationCommandOptionType>,
    APIApplicationCommandOptionChoice<string | number>
  >["choices"]
) {
  if (!ExistingChoices || !LocalChoices) return false;
  for (const LocalChoice of LocalChoices) {
    const ExistingChoice = ExistingChoices?.find((choice) => choice.name === LocalChoice.name);

    if (!ExistingChoice) {
      return true;
    }

    if (
      LocalChoice.value !== ExistingChoice.value ||
      LocalChoice.name_localizations !== ExistingChoice.name_localizations
    ) {
      return true;
    }
  }

  return false;
}

function AreSlashCommandOptionsDifferent(
  ExistingOptions: SlashCommandOptions | undefined,
  LocalCmdOptions: SlashCommandOptions | undefined
) {
  if (!ExistingOptions && !LocalCmdOptions) return false;
  if (!ExistingOptions || !LocalCmdOptions) return true;
  for (const LocalOption of LocalCmdOptions) {
    const ExistingOption = ExistingOptions?.find((Option) => Option.name === LocalOption.name);

    if (!ExistingOption) {
      return true;
    }

    if (
      LocalOption.type !== ExistingOption.type ||
      LocalOption.required !== ExistingOption.required ||
      LocalOption.description !== ExistingOption.description ||
      LocalOption.name_localizations !== ExistingOption.name_localizations ||
      LocalOption.description_localizations !== ExistingOption.description_localizations ||
      ("autocomplete" in LocalOption &&
        "autocomplete" in ExistingOption &&
        LocalOption.autocomplete !== ExistingOption.autocomplete) ||
      ("choices" in LocalOption &&
        "choices" in ExistingOption &&
        (LocalOption.choices?.length || 0) !== (ExistingOption.choices?.length || 0)) ||
      ("choices" in LocalOption &&
        "choices" in ExistingOption &&
        AreSlashCommandOptionChoicesDifferent(LocalOption.choices, ExistingOption.choices))
    ) {
      return true;
    }
  }

  return false;
}

function ContextMenuCommandsAreIdentical(
  Cmd_1: ApplicationCommand,
  Cmd_2: ContextMenuCommandObject
): boolean {
  const Json_1 = Cmd_1.toJSON() as RESTPostAPIContextMenuApplicationCommandsJSONBody;
  const Json_2 = Cmd_2.data.toJSON();

  return (
    Json_1.type === Json_2.type &&
    (Json_1.contexts || []).every((context) => Json_2.contexts?.includes(context)) &&
    (Json_1.name_localizations || null) === (Json_2.name_localizations || null)
  );
}
