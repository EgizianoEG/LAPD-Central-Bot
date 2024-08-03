import * as Linkify from "linkifyjs";

// TODO: Add support for utilizing Discord's automod rule regexes for filtering user input text.
/**
 * Redacts links and emails from an input string.
 * @param Input - The input string to redact links and emails from.
 * @param Replacement - The replacement character to use when redacting links and emails. Defaults to `*` for every single character redacted/replaced.
 * @returns An array containing the modified input string (if modified, validate by comparing with `Input`).
 */
export function RedactLinksAndEmails(Input: string, Replacement?: string): string {
  const Matches = Linkify.find(Input);
  for (const Match of Matches) {
    Input =
      Input.slice(0, Match.start) +
      (Replacement ?? "*").repeat(Match.value.length) +
      Input.slice(Match.end);
  }

  return Input;
}
