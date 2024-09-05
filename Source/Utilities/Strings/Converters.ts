/**
 * Converts an input string into title case format with optional strict formatting.
 * @param Str - The string to convert into title case format
 * @param Strict - Whether or not to strict format the input string; defaults to `true`
 * @returns The converted string. When parameter `Strict` is `false`, every word in the input string would be capitalized.
 * @requires {@link UpperFirst `Converter.UpperFirst()`}
 * @example
 * TitleCase("hello, world of the earth!")  // returns "Hello, World of the Earth!"
 * TitleCase("testing X3")  // returns "Testing x3"
 */
export function TitleCase(Str: string, Strict: boolean = true): string {
  if (!Str) return "";

  const Uppers = [
    "id",
    "po",
    "leo",
    "adw",
    "atm",
    "lapd",
    "lasd",
    "fbi",
    "dea",
    "lc",
    "mph",
    "lbs",
  ];

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
    return Cap.match(/\bx\d+\b/i) ? Cap.toLowerCase() : UpperFirst(Cap);
  });

  // Preserve certain words in lower-case and some acronyms in upper-case.
  if (Strict) {
    for (const Lower of Lowers) {
      const Regex = new RegExp("\\b" + Lower + "\\b", "gi");
      Modified = Modified.replace(Regex, Lower.toLowerCase());
    }

    for (const Acronym of Uppers) {
      const Regex = new RegExp("\\b" + Acronym + "\\b", "gi");
      Modified = Modified.replace(Regex, Acronym.toUpperCase());
    }
  }

  return UpperFirst(Modified, false);
}

/**
 * Converts an input string of basic Latin alphabet, numbers, and special characters to camel case format.
 * @see {@link https://stackoverflow.com/a/2970667 Stack Overflow Reference}
 * @notice
 * - With the exception of a single initial `$` sign, which is included if it exists,
 *   this function will not retain any other special characters at the start, middle, or end of the string.
 * - The input string's in between special characters will be ignored and handled as regular whitespace.
 *
 * @param Str - The string to convert.
 * @returns The input string in camel case format if succeeded.
 * @example
 * CamelCase("#@$@#%@---")        // returns "#@$@#%@---" (not appropriate to be converted)
 * CamelCase("PascalCaseString")  // returns "pascalCaseString"
 * CamelCase("kebab-case-string") // returns "kebabCaseString"
 * CamelCase("dot.case.string")   // returns "dotCaseString"
 * CamelCase("$Var_1")            // returns "$var1"
 * CamelCase("__FOO_BAR__-")      // returns "fooBar"
 * CamelCase("Thirty4auto5Var")   // returns "thirty4Auto5Var"
 * CamelCase("special_characters!@#$%^&*\(")  // returns "specialCharacters"
 *
 * // returns "$done45AndGoIng"
 * // (notice the character `i` being uppercased as the previous special characters are treated as a single whitespace character)
 * CamelCase("$Done_45_and_go#$&^*^&*@#$@#$@#$&*^&(&*ing")
 */
export function CamelCase(Str: string): string {
  let SDSign = "";
  const Sanitized = Str.replace(/^[\W\s_\uFEFF\xA0]+|[\W\s_\uFEFF\xA0]+$/gu, "").replace(
    /[^\w]+|[\s_]+/g,
    " "
  );

  if (!Sanitized) return Str;
  if (Str.match(/\$[\da-z]/i)) SDSign = "$";
  if (Sanitized.match(/^[\da-z]+$/)) return SDSign + Sanitized;
  if (Sanitized.match(/^[A-Z\d\s]+$/)) {
    return (
      SDSign +
      Sanitized.split(" ")
        .map((Capture, Index) => {
          const FChar = Index === 0 ? Capture.at(0)?.toLowerCase() : Capture.at(0)?.toUpperCase();
          return FChar + Capture.slice(1).toLowerCase();
        })
        .join("")
    );
  }

  return (
    SDSign +
    Sanitized.replace(/(?:^\w|[A-Z]|\b\w|\d[a-z])/g, (Word, Index) => {
      return Index === 0 ? Word.toLowerCase() : Word.toUpperCase();
    }).replace(/\s+/g, "")
  );
}

/**
 * Uppers the first character of a string and lowers the rest of its length by default.
 * @notice This does not behave the same as lodash's upperFirst function implementation and converts the rest of the string to lowercase.
 * @param Str - The string to process
 * @param [LowerRest=true] - Whether to lower the rest of the string or not.
 * @returns
 * @example
 * UpperFirst("heLLo!")  // returns "Hello!"
 * UpperFirst("1. item")  // returns "1. item"
 */
export function UpperFirst(Str: string, LowerRest: boolean = true): string {
  return Str.charAt(0)?.toUpperCase() + (LowerRest ? Str.slice(1).toLowerCase() : Str.slice(1));
}

/**
 * Converts a PascalCase string to normal sentence case.
 * @param Str - The PascalCase string to be converted.
 * @return The normal sentence case string.
 * @notice
 * - The input string will be trimmed.
 * - Numbers won't be treated as words but will be combined with the previous ones.
 *
 * @example
 * const PascalCase = "PascalCaseString";
 * console.log(PascalToNormal(PascalCase));  // returns "Pascal Case String"
 */
export function PascalToNormal(Str: string): string {
  return Str.replace(/(?<!\s+)[A-Z]/g, " $&")
    .replace(/\s+/, " ")
    .trim();
}

/**
 * Attempts converting an input string into snake case format.
 * @see {@link https://stackoverflow.com/a/69878219 Stack Overflow Reference}
 * @param Str - The input string to convert.
 * @returns The input string in snake case format if succeeded.
 */
export function SnakeCase(Str: string): string {
  return SplitCaps(Str)
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((Word) => Word.toLowerCase())
    .join("_");
}

/**
 * Converts a given object property names into a snake case representation.
 * @param Obj
 * @returns
 */
export function ObjKeysToSnakeCase(Obj: object): object {
  if (Array.isArray(Obj)) {
    return Obj.map((v) => ObjKeysToSnakeCase(v));
  } else if (Obj != null && Obj.constructor === Object) {
    return Object.keys(Obj).reduce(
      (result, key) => ({
        ...result,
        [SnakeCase(key)]: ObjKeysToSnakeCase(Obj[key]),
      }),
      {}
    );
  }
  return Obj;
}

function SplitCaps(Str: string): string {
  return Str.replace(/([a-z])([A-Z]+)/g, (_, s1, s2) => s1 + " " + s2)
    .replace(/([A-Z])([A-Z]+)([^a-zA-Z0-9]*)$/, (_, s1, s2, s3) => s1 + s2.toLowerCase() + s3)
    .replace(/([A-Z]+)([A-Z][a-z])/g, (_, s1, s2) => s1.toLowerCase() + " " + s2);
}
