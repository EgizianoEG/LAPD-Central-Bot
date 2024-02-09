import ERLCVehiclesData, { AllVehicleModels } from "@Resources/ERLCVehicles.js";
import { TenCodes, ElevenCodes, LiteralCodes, CodeType } from "@Resources/RadioCodes.js";
import { ErrorMessages, InfoMessages } from "@Resources/AppMessages.js";
import { Vehicles } from "@Typings/Resources.js";
import BrickColors from "@Resources/BrickColors.js";
import SampleTexts from "@Resources/SampleTexts.js";

describe("Sample Texts (SampleTexts.js)", () => {
  it("Should only contain lines of alpha letters, spaces, and dashes with a word range of 7 to 12 words", () => {
    for (const Line of SampleTexts) {
      const NumOfWords = Line.split(" ").length;
      expect(Line).toMatch(/^[a-zA-Z- ]+$/);
      expect(NumOfWords).toBeLessThanOrEqual(12);
      expect(NumOfWords).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("Application Messages (AppMessages.js)", () => {
  describe("ErrorMessages", () => {
    test.each(Object.entries(ErrorMessages))(
      "'%s' message object should have Title and Description properties of type string",
      (_, Msg) => {
        expect(Msg).toHaveProperty("Title");
        expect(Msg).toHaveProperty("Description");

        expect(typeof Msg.Title).toBe("string");
        expect(typeof Msg.Description).toBe("string");
      }
    );
  });

  describe("InfoMessages", () => {
    test.each(Object.entries(InfoMessages))(
      "%s message object should have Title and Description properties of type string",
      (_, Msg) => {
        expect(Msg).toHaveProperty("Title");
        expect(Msg).toHaveProperty("Description");

        expect(typeof Msg.Title).toBe("string");
        expect(typeof Msg.Description).toBe("string");
      }
    );
  });
});

describe("ER:LC Vehicles (ERLCVehicles.js)", () => {
  describe("Default Export - ERLCVehiclesData", () => {
    test("The default export should be an array", () => {
      expect(Array.isArray(ERLCVehiclesData)).toBe(true);
    });

    test("Each vehicle object in ERLCVehiclesData should have the expected structure", () => {
      ERLCVehiclesData.forEach((Vehicle: Vehicles.VehicleData) => {
        expect(Vehicle).toHaveProperty("brand");
        expect(Vehicle).toHaveProperty("counterpart");
        expect(Vehicle).toHaveProperty("models");
        expect(Array.isArray(Vehicle.models)).toBe(true);

        Vehicle.models.forEach((Model: Vehicles.VehicleModel) => {
          expect(Model).toHaveProperty("name");
          expect(Model).toHaveProperty("alias");
          expect(Model).toHaveProperty("style");
          expect(Model).toHaveProperty("class");
          expect(Model).toHaveProperty("category");
          expect(Model).toHaveProperty("model_year");
        });
      });
    });
  });

  describe("AllVehicleModels Constant", () => {
    test("AllVehicleModels should be an array", () => {
      expect(Array.isArray(AllVehicleModels)).toBe(true);
    });

    test("Each vehicle model object in AllVehicleModels should have the expected structure", () => {
      AllVehicleModels.forEach(
        (Model: Vehicles.VehicleModel & { brand: string; counterpart: string }) => {
          expect(Model).toHaveProperty("brand");
          expect(Model).toHaveProperty("counterpart");
          expect(Model).toHaveProperty("name");
          expect(Model).toHaveProperty("alias");
          expect(Model).toHaveProperty("style");
          expect(Model).toHaveProperty("class");
          expect(Model).toHaveProperty("category");
          expect(Model).toHaveProperty("model_year");
        }
      );
    });
  });
});

describe("LEO Radio Codes (RadioCodes.js)", () => {
  const TestCodeArray = (Codes: CodeType[], CodeType: string) => {
    test(`'${CodeType}' should be an array`, () => {
      expect(Array.isArray(Codes)).toBe(true);
    });

    test(`each code object in '${CodeType}' code type should have the expected structure`, () => {
      Codes.forEach((Code: CodeType) => {
        expect(Code).toHaveProperty("code");
        expect(Code).toHaveProperty("title");
        expect(Code).toHaveProperty("description");
        expect(typeof Code.code).toBe("string");
        expect(typeof Code.title).toBe("string");
        expect(typeof Code.description).toBe("string");
        if (Code.notes) {
          expect(Array.isArray(Code.notes) || typeof Code.notes === "object").toBe(true);
        }
        if (Code.usage_contexts) {
          expect(
            Array.isArray(Code.usage_contexts) || typeof Code.usage_contexts === "object"
          ).toBe(true);
        }
        if (Code.usage_examples) {
          expect(
            Array.isArray(Code.usage_examples) || typeof Code.usage_examples === "object"
          ).toBe(true);
        }
        if (Code.references) {
          expect(Array.isArray(Code.references)).toBe(true);
        }
      });
    });
  };

  TestCodeArray(TenCodes, "TenCodes");
  TestCodeArray(ElevenCodes, "ElevenCodes");
  TestCodeArray(LiteralCodes, "LiteralCodes");
});

describe("Roblox Brick Colors (BrickColors.js)", () => {
  test("BrickColors, the default export, should be an array", () => {
    expect(Array.isArray(BrickColors)).toBe(true);
  });

  test("Each object in BrickColors should have the expected structure", () => {
    BrickColors.forEach((Color) => {
      expect(Color).toHaveProperty("name");
      expect(Color).toHaveProperty("hex");
      expect(Color).toHaveProperty("number");
      expect(typeof Color.name).toBe("string");
      expect(typeof Color.hex).toBe("string");
      expect(typeof Color.number).toBe("number");
    });
  });

  test("Hex color codes should be valid", () => {
    const HexRegex = /^#([0-9A-F]{3}){1,2}$/i;
    BrickColors.forEach((Color) => {
      expect(HexRegex.test(Color.hex)).toBe(true);
    });
  });
});
