/**
 * Uppers the first character of a string and lowers the rest of its length
 * @param {String} Str - The input string
 * @returns {String} The converted string
 * @example
 * UpperFirst("heLLo!")  // returns "Hello!"
 */
function UpperFirst(Str) {
  const up = Str.at(0).toUpperCase() + Str.substring(1).toLowerCase();
  console.log(up);
  return Str.at(0).toUpperCase() + Str.substring(1).toLowerCase();
}

/**
 * Title case a given string
 * @param {String} Str - The string to convert into title case format
 * @param {Boolean} [Strict=true] - Whether or not to strict format the input string
 * @returns {String} The converted string
 * @example
 * TitleCase("hello, world of the earth!")  // returns "Hello, World of the Earth!"
 * TitleCase("testing X3")  // returns "Testing x3"
 */
function TitleCase(Str, Strict = true) {
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
    if (Cap.match(/x\d+/)) {
      return Cap.toLowerCase();
    } else {
      return UpperFirst(Cap);
    }
  });

  // Preserve certain words in lower-case and some acronyms in upper-case.
  if (Strict) {
    for (const Lower of Lowers) {
      const Regex = new RegExp("\\b" + Lower + "\\b", "gi");
      Modified = Modified.replace(Regex, (Cap) => {
        if (Modified.startsWith(Cap)) {
          return Cap;
        } else {
          return Lower;
        }
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
 * @see {@link https://stackoverflow.com/a/2970667/11442726 Stack Overflow} Original author
 * @param {String} Str - The string to convert
 * @returns {String} Returns the given string in camel case format
 * @example
 * TitleCase("AutoComp")  // returns "autoComp"
 * TitleCase("Auto_Comp_42")  // returns "autoComp42"
 */
function CamelCase(Str) {
  return Str.replace(/(?:^\w|[A-Z]|\b\w)/g, (Word, Index) => {
    return Index === 0 ? Word.toLowerCase() : Word.toUpperCase();
  }).replace(/\s+/g, "");
}

/**
 * Normalizes the given pascal string and adds back spaces
 * @param {String} Str
 * @returns {String}
 */
function PascalToNormal(Str) {
  return Str.replace(/([A-Z])/g, " $1").trim();
}

module.exports = { TitleCase, CamelCase, PascalToNormal };
