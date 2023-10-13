/**
 * Uppers the first character of a string and lowers the rest of its length
 * @param Str - The string to process
 * @returns
 * @example
 * UpperFirst("heLLo!")  // returns "Hello!"
 * UpperFirst("1. item")  // returns "1. item"
 */
export function UpperFirst(Str: string): string {
  return Str.charAt(0)?.toUpperCase() + Str.slice(1).toLowerCase();
}

/**
 * Title case a given string
 * @param Str - The string to convert into title case format
 * @param Strict - Whether or not to strict format the input string; defaults to `true`
 * @returns The converted string
 * @requires {@link UpperFirst `Converter.UpperFirst()`}
 * @example
 * TitleCase("hello, world of the earth!")  // returns "Hello, World of the Earth!"
 * TitleCase("testing X3")  // returns "Testing x3"
 */
export function TitleCase(Str: string, Strict: boolean = true): string {
  const Uppers = ["id", "po", "leo", "adw", "atm", "lapd", "lasd", "fbi", "dea", "lc"];
  const Lowers = [
    "a",
    "an",
    "or",
    "in",
    "on",
    "of",
    "up",
    "at",
    "by",
    "to",
    "as",
    "so",
    "and",
    "the",
    "but",
    "for",
    "not",
    "yet",
    "out",
    "nor",
    "from",
    "with",
    "atop",
    "over",
    "down",
    "into",
    "near",
    "over",
    "plus",
    "past",
    "under",
    "until",
  ];

  // Capitalize the first letter of each word except numbers starting with "x" (e.g. "Tasks: x3")
  let Modified = Str.replace(/[^\W]+[^\s-]* */g, (Cap) => {
    return Cap.match(/x\d+/) ? Cap.toLowerCase() : UpperFirst(Cap);
  });

  // Preserve certain words in lower-case and some acronyms in upper-case.
  if (Strict) {
    for (const Lower of Lowers) {
      const Regex = new RegExp("\\b" + Lower + "\\b", "gi");
      Modified = Modified.replace(Regex, (Cap) => {
        return Modified.startsWith(Cap) ? Cap : Lower;
      });
    }
    for (const Acronym of Uppers) {
      const Regex = new RegExp("\\b" + Acronym + "\\b", "gi");
      Modified = Modified.replace(Regex, Acronym.toUpperCase());
    }
  }

  return Modified;
}

/**
 * Converts a given string to camel case format
 * @see {@link https://stackoverflow.com/a/2970667/11442726 Stack Overflow Reference}
 * @param Str - The string to convert
 * @returns Returns the given string in camel case format
 * @example
 * TitleCase("AutoComp")  // returns "autoComp"
 * TitleCase("Auto_Comp_42")  // returns "autoComp42"
 */
export function CamelCase(Str: string): string {
  return Str.replace(/(?:^\w|[A-Z]|\b\w)/g, (Word, Index) => {
    return Index === 0 ? Word.toLowerCase() : Word.toUpperCase();
  }).replace(/\s+/g, "");
}

/**
 * Converts a PascalCase string to normal sentence case.
 * @param Str - The PascalCase string to be converted.
 * @return The normal sentence case string.
 * @example
 * const PascalCase = 'PascalCaseString';
 * console.log(PascalToNormal(PascalCase));  // returns "Pascal Case String"
 */
export function PascalToNormal(Str: string): string {
  return Str.replace(/[A-Z]/g, " $&").trim();
}

/**
 * Escapes special characters in a string for additional processing using regular expressions.
 * @see {@link https://stackoverflow.com/a/6969486/11442726 Stack Overflow Reference}
 * @param Str - The string to process and escape.
 * @returns The given string with special characters escaped using backslashes.
 */
export function EscapeRegex(Str: string): string {
  return Str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
