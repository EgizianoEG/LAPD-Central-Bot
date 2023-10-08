import DummyTexts from "@Resources/SampleTexts.js";

const Cache = { ".": [" "] };
for (let CharCode = 0; CharCode <= 255; CharCode++) {
  Cache["."].push(String.fromCharCode(CharCode));
}

function CharactersFromSet(CharSet: string | RegExp): string[] {
  const Characters: string[] = [];

  for (const Character of Cache["."]) {
    if (Character) {
      if (CharSet.constructor === RegExp) {
        if (Character.match(CharSet)) Characters.push(Character);
      } else if (Character.match(new RegExp(CharSet))) Characters.push(Character);
    }
  }

  Cache[String(CharSet)] = Characters;
  return Characters;
}

/**
 * Returns a randomly generated string
 * @param Length - The desired length of the generated string
 * @param CharSet - The desired range of generated characters
 * @return The generated string
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
 */
export function DummyText(): string {
  return DummyTexts[Math.floor(Math.random() * DummyTexts.length)];
}
