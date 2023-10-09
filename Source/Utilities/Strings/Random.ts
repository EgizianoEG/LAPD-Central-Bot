import DummyTexts from "@Resources/SampleTexts.js";

const Cache = { ".": [" "] };
for (let CharCode = 0; CharCode <= 255; CharCode++) {
  Cache["."].push(String.fromCharCode(CharCode));
}

/**
 * Generates an array of characters that match the given character set.
 * @param CharSet - The character set to match against.
 * @return An array of characters that match the character set.
 */
function CharactersFromSet(CharSet: string | RegExp): string[] {
  const Characters: string[] = [];
  const CacheKey = String(CharSet);

  if (Cache[CacheKey]) return Cache[CacheKey];
  for (const Character of Cache["."]) {
    if (Character) {
      if (CharSet.constructor === RegExp) {
        if (Character.match(CharSet)) Characters.push(Character);
      } else if (Character.match(new RegExp(CharSet))) Characters.push(Character);
    }
  }

  Cache[CacheKey] = Characters;
  return Characters;
}

/**
 * Generates a random string of a specified length using a given character set.
 * @param Length - The desired length of the generated string; defaults to `10`.
 * @param CharSet - The desired range of generated characters; defaults to alphanumeric characters.
 * @return The generated string
 * @requires {@link CharactersFromSet `Random.CharactersFromSet()`}
 */
export function RandomString(Length: number = 10, CharSet: string | RegExp = /\w/): string {
  const CharPattern = Cache[String(CharSet)] ?? CharactersFromSet(CharSet);
  const Randomized: string[] = [];
  const MaxRange = CharPattern.length;

  for (let CharIndex = 0; CharIndex < Length; CharIndex++) {
    Randomized[CharIndex] = CharPattern[Math.floor(Math.random() * MaxRange)];
  }

  return Randomized.join("");
}

/**
 * Returns a randomly chosen filtered dummy text between 8-12 words
 * @returns
 * @requires {@link DummyTexts Sample Texts Array}
 */
export function DummyText(): string {
  return DummyTexts[Math.floor(Math.random() * DummyTexts.length)];
}
