/**
 * @param {import("discord.js").ApplicationCommand & any} Cmd_1
 * @param {SlashCommandObject["data"]} Cmd_2
 * @returns {Boolean}
 */
function Equals(Cmd_1, Cmd_2) {
  Cmd_1 = Cmd_1.toJSON();
  Cmd_2 = Cmd_2.data.toJSON();

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
    Cmd_1.description !== Cmd_2.description ||
    Cmd_1.options?.length !== (Cmd_2.options?.length || 0) ||
    AreOptionsDifferent(Cmd_1.options, Cmd_2.options || [])
  );
}

module.exports = Equals;
