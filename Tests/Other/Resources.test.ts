import SampleTexts from "@Resources/SampleTexts.js";

describe("Sample Texts", () => {
  it("Should only contain lines of alpha letters, spaces, and dashes with a word range of 7 to 12 words", () => {
    for (const Line of SampleTexts) {
      const NumOfWords = Line.split(" ").length;
      expect(Line).toMatch(/^[a-zA-Z- ]+$/);
      expect(NumOfWords).toBeLessThanOrEqual(12);
      expect(NumOfWords).toBeGreaterThanOrEqual(7);
    }
  });
});
