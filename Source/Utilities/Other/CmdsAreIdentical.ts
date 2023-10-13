import type {
  ApplicationCommand,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

/**
 * Validates two slash commands if they are semi-equal in properties and values
 * @param Cmd_1 - The first slash command to compare
 * @param Cmd_2 - The second slash command to compare
 * @returns
 */
export default function CmdsAreEqual(
  Cmd_1: ApplicationCommand,
  Cmd_2: SlashCommandObject
): boolean {
  const Cmd_Data_1 = Cmd_1.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody;
  const Cmd_Data_2 = Cmd_2.data.toJSON();

  const AreChoicesDifferent = (ExistingChoices, LocalChoices) => {
    for (const LocalChoice of LocalChoices) {
      const ExistingChoice = ExistingChoices?.find((choice) => choice.name === LocalChoice.name);

      if (!ExistingChoice) {
        return true;
      }

      if (LocalChoice.value !== ExistingChoice.value) {
        return true;
      }
    }
    return false;
  };

  const AreOptionsDifferent = (ExistingOptions, LocalOptions) => {
    for (const LocalOption of LocalOptions) {
      const ExistingOption = ExistingOptions?.find((Option) => Option.name === LocalOption.name);

      if (!ExistingOption) {
        return true;
      }

      if (
        LocalOption.description !== ExistingOption.description ||
        LocalOption.type !== ExistingOption.type ||
        LocalOption.required !== ExistingOption.required ||
        (LocalOption.choices?.length || 0) !== (ExistingOption.choices?.length || 0) ||
        AreChoicesDifferent(LocalOption.choices || [], ExistingOption.choices || [])
      ) {
        return true;
      }
    }
    return false;
  };

  return !(
    Cmd_Data_1.description !== Cmd_Data_2.description ||
    Cmd_Data_1.options?.length !== (Cmd_Data_2.options?.length ?? 0) ||
    AreOptionsDifferent(Cmd_Data_1.options, Cmd_Data_2.options ?? [])
  );
}
