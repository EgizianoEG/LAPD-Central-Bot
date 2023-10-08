/**
 * Uppers the first character of a string and lowers the rest of its length
 * @example
 * UpperFirst("heLLo!")  // returns "Hello!"
 */
export function UpperFirst(Str: string): string {
  return Str.at(0)?.toUpperCase() + Str.substring(1).toLowerCase();
}

/**
 * Title case a given string
 * @param Str - The string to convert into title case format
 * @param {*} [Strict=true] - Whether or not to strict format the input string; defaults to `true`
 * @returns The converted string
 * @example
 * TitleCase("hello, world of the earth!")  // returns "Hello, World of the Earth!"
 * TitleCase("testing X3")  // returns "Testing x3"
 */
export function TitleCase(Str: string, Strict: boolean = true): string {
  const Uppers = ["id", "po", "leo", "adw", "atm", "lapd", "lasd", "fbi", "dea", "lc"];
  const Lowers = [
    "a",
    "an",
    "and",
    "or",
    "the",
    "but",
    "in",
    "on",
    "of",
    "up",
    "at",
    "by",
    "for",
    "from",
    "with",
    "under",
    "until",
    "atop",
    "to",
    "not",
    "over",
    "as",
    "down",
    "yet",
    "so",
    "into",
    "near",
    "over",
    "plus",
    "past",
    "out",
    "nor",
  ];

  // Capitalize the first letter of each word except numbers starting with "x"
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
 * @param Str - The string to convert
 * @returns Returns the given string in camel case format
 * @see {@link https://stackoverflow.com/a/2970667/11442726 Stack Overflow} Original author
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
 * Normalizes the given pascal string and adds back spaces
 */
export function PascalToNormal(Str: string): string {
  return Str.replace(/([A-Z])/g, " $1").trim();
}

/**
 * Escapes the given string for additional processing using regular expressions
 * @see {@link https://stackoverflow.com/a/6969486/11442726 Stack Overflow} Original author
 */
export function EscapeRegex(Str: string): string {
  return Str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
