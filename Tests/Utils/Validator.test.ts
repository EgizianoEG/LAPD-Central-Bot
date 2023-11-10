/* eslint-disable no-new-object */
import { SlashCommandBuilder } from "discord.js";
import {
  IsValidRobloxUsername,
  IsValidShiftTypeName,
  IsValidCmdObject,
  IsPlainObject,
  IsEmptyObject,
} from "@Utilities/Other/Validator";

describe("IsValidRobloxUsername", () => {
  it("Should return false for strings of less than 3 or more than 20 characters in length", () => {
    expect(IsValidRobloxUsername("")).toBeFalsy();
    expect(IsValidRobloxUsername("UsernameExCom12345678")).toBeFalsy();
  });

  it("Should return false for usernames containing illegal or special characters", () => {
    expect(IsValidRobloxUsername("1&2Roblox-User")).toBeFalsy();
    expect(IsValidRobloxUsername("Roblox Username")).toBeFalsy();
  });

  it("Should return false for usernames with leading, trailing, or multiple in-between underscores", () => {
    expect(IsValidRobloxUsername("__RobloxUser")).toBeFalsy();
    expect(IsValidRobloxUsername("_Builder_Man__")).toBeFalsy();
  });

  it("Should return true for valid Roblox usernames", () => {
    expect(IsValidRobloxUsername("Char")).toBeTruthy();
    expect(IsValidRobloxUsername("admin123")).toBeTruthy();
    expect(IsValidRobloxUsername("54852320")).toBeTruthy();
    expect(IsValidRobloxUsername("Builderman")).toBeTruthy();
    expect(IsValidRobloxUsername("roblox_user50")).toBeTruthy();
    expect(IsValidRobloxUsername("Example_Username")).toBeTruthy();
    expect(IsValidRobloxUsername("OnlyTwentyCharacters")).toBeTruthy();
  });
});

describe("IsValidShiftTypeName", () => {
  it("Should return false for strings of less than 3 or more than 20 characters in length (after trimming)", () => {
    expect(IsValidShiftTypeName("")).toBeFalsy();
    expect(IsValidShiftTypeName("     ")).toBeFalsy();
    expect(IsValidShiftTypeName("NewShiftTypeNoNameYet")).toBeFalsy();
  });

  it("Should return false for invalid shift type names which contain illegal characters", () => {
    expect(IsValidShiftTypeName("#123 Shift")).toBeFalsy();
    expect(IsValidShiftTypeName("Shift @ 9am")).toBeFalsy();
    expect(IsValidShiftTypeName("unknown*shift")).toBeFalsy();
  });

  it("Should return true for valid shift type names", () => {
    expect(IsValidShiftTypeName("Morning")).toBeTruthy();
    expect(IsValidShiftTypeName("On-Call")).toBeTruthy();
    expect(IsValidShiftTypeName("Evening Shift")).toBeTruthy();
    expect(IsValidShiftTypeName("L.A.P.D. Patrol")).toBeTruthy();
    expect(IsValidShiftTypeName("Supervisory_Shift")).toBeTruthy();
  });
});

describe("IsValidCmdObject", () => {
  it("should return false for invalid/empty command objects", () => {
    expect(IsValidCmdObject({ data: {} } as any)).toBeFalsy();
    expect(IsValidCmdObject({ options: {} } as any)).toBeFalsy();
  });

  it("Should return false for command objects with excluded names", () => {
    const Exceptions = ["ping"];
    const CmdObject: SlashCommandObject = {
      callback: () => Promise.resolve(),
      data: new SlashCommandBuilder().setName("ping").setDescription("Pings the bot"),
    };

    expect(IsValidCmdObject(CmdObject, Exceptions)).toBeFalsy();
  });

  it("Should return true for valid slash command objects", () => {
    const CmdObject = {
      options: {},
      callback: () => Promise.resolve(),
      data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pings the bot")
        .setDMPermission(true),
    };

    expect(IsValidCmdObject(CmdObject)).toBeTruthy();
  });
});

describe("IsPlainObject", () => {
  it("Should return true for plain objects", () => {
    expect(IsPlainObject({})).toBeTruthy();
    expect(IsPlainObject({ key: "value" })).toBeTruthy();
    expect(IsPlainObject(new Object())).toBeTruthy();
  });

  it("Should return false for non-plain objects", () => {
    expect(IsPlainObject([])).toBeFalsy();
    expect(IsPlainObject(null)).toBeFalsy();
    expect(IsPlainObject(function () {})).toBeFalsy();
  });
});

describe("IsEmptyObject", () => {
  it("Should return true for empty objects with no defined keys", () => {
    expect(IsEmptyObject({})).toBeTruthy();
    expect(IsEmptyObject(new Object())).toBeTruthy();
  });

  it("Should return false for non-empty objects", () => {
    expect(IsEmptyObject({ key: null })).toBeFalsy();
    expect(IsEmptyObject({ key: undefined as any })).toBeFalsy();
    expect(IsEmptyObject({ key: "value" })).toBeFalsy();
    expect(IsEmptyObject({ a: 1, b: 2 })).toBeFalsy();
    expect(IsEmptyObject([1, 2, 3])).toBeFalsy();
  });
});
