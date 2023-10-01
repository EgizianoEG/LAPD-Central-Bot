const DummyTexts = require("../../Resources/SampleTexts.js");
const Cache = { ".": [" "] };
// ----------------------------------------------------------------
// Initialization
for (let CharCode = 0; CharCode <= 255; CharCode++) {
  Cache["."].push(String.fromCharCode(CharCode));
}

/**
 * Returns a requested character set
 * @param {String|RegExp} CharSet
 * @returns {Array<String>} The requested character set
 */
function CharactersFromSet(CharSet) {
  const Characters = [];

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
 * @param {Number} [Length=10] - The desired length of the generated string
 * @param {String|RegExp} [CharSet=/\w/] - The desired range of generated characters
 * @returns {String} The generated string
 */
function RandomString(Length = 10, CharSet = /\w/) {
  const CharPattern = Cache[String(CharSet)] ?? CharactersFromSet(CharSet);
  const MaxRange = CharPattern.length;
  const Randomized = [];

  for (let CharIndex = 0; CharIndex < Length; CharIndex++) {
    Randomized[CharIndex] = CharPattern[Math.floor(Math.random() * MaxRange)];
  }

  return Randomized.join("");
}

/**
 * Returns a randomly chosen filtered dummy text between 8-12 words
 * @returns {String}
 */
function DummyText() {
  return DummyTexts[Math.floor(Math.random() * DummyTexts.length)];
}

// ----------------------------------------------------------------
module.exports = {
  DummyText,
  RandomString,
};
