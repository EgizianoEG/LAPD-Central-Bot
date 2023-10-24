import AppConfig, { Discord, Roblox, MongoDB, OpenWeather } from "@Config/Secrets.js";
import { SnowflakeUtil } from "discord.js";

// ---------------------------------------------------------------------------------------
// Helpers:
// --------
const Cyanish = (Str: string) => `\x1b[36m${Str}\x1b[39m`;
const IsValidSnowflake = (Input: string) => {
  const DiscordEpoch = 1420070450000;
  const CurrentEpoch = Date.now();
  const ActualEpoch = SnowflakeUtil.timestampFrom(Input);
  return !!(
    Input?.match(/^\d{15,22}$/) &&
    ActualEpoch >= DiscordEpoch &&
    ActualEpoch <= CurrentEpoch
  );
};

// ---------------------------------------------------------------------------------------
// Tests:
// ------
describe("Secrets Config File", () => {
  it("Should export secrets in both ways; default and named exports with the same values", () => {
    expect(AppConfig).toStrictEqual({
      Discord,
      Roblox,
      MongoDB,
      OpenWeather,
    });
  });
});

describe("Secrets.Roblox", () => {
  it(`Should have a valid ${Cyanish("Cookie")} string value with its warning text`, () => {
    expect(typeof Roblox.Cookie).toBe("string");
    expect(Roblox.Cookie).toMatch(
      /^_\|WARNING:-DO-NOT-SHARE-THIS\.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items\.\|_[0-9A-F]{200,}$/
    );
  });
});

describe("Secrets.Discord", () => {
  it(`Should only contain key-value pairs of type string except for ${Cyanish(
    "TestGuildId"
  )}; which is an array of snowflakes`, () => {
    for (const [Key, Value] of Object.entries(Discord)) {
      expect(typeof Key).toBe("string");
      if (Key === "BotDevs") {
        expect(Array.isArray(Value)).toBe(true);
        for (const DevId of Value) {
          expect(typeof DevId).toBe("string");
        }
      } else {
        expect(typeof Value).toBe("string");
      }
    }
  });

  it(`Should have a valid ${Cyanish("BotDevs")} value; an array of snowflake ids`, () => {
    for (const DevId of Discord.BotDevs) {
      expect(IsValidSnowflake(DevId)).toBe(true);
    }
  });

  it(`Should have a valid ${Cyanish("ClientId")} value; a snowflake id`, () => {
    expect(IsValidSnowflake(Discord.ClientId)).toBe(true);
  });

  it(`Should have a valid ${Cyanish("TestGuildId")} value; a snowflake id`, () => {
    expect(IsValidSnowflake(Discord.TestGuildId)).toBe(true);
  });

  it(`Should have a valid ${Cyanish("BotToken")} value`, () => {
    expect(Discord.BotToken).toMatch(/^[MN][\w-]{23,25}\.[\w-]{6}\.[\w-]{27,39}$/);
  });
});

describe("Secrets.MongoDB", () => {
  it("Should only have key-value pairs of type string", () => {
    for (const [Key, Value] of Object.entries(MongoDB)) {
      expect(typeof Key).toBe("string");
      expect(typeof Value).toBe("string");
    }
  });

  it(`Should have a valid ${Cyanish("URI")} value with username and password placeholders`, () => {
    expect(MongoDB.URI).toMatch(
      /^mongodb(?:\+srv)?:\/\/<username>:<password>@[^\W_][\w-]*\.[^.]+\.[^.]+\.(?:net|com|org).*$/
    );
  });

  it(`Should have a valid ${Cyanish("DBName")} value`, () => {
    expect(MongoDB.DBName).toMatch(/^[^/.\s"$*<>:|?]{1,63}$/);
  });

  it(`Should have a valid ${Cyanish("Username")} value`, () => {
    expect(MongoDB.Username).toMatch(/^[^\W_][\w-]*$/);
  });

  it(`Should have a valid ${Cyanish("UserPass")} value`, () => {
    expect(MongoDB.UserPass).toMatch(/^.+$/);
  });
});

describe("Secrets.OpenWeather", () => {
  it(`Should have a valid ${Cyanish("API_Key")} value of 32 hexadecimal characters`, () => {
    expect(OpenWeather.API_Key).toMatch(/^[0-9A-F]{32}$/i);
  });

  it(`Should have a valid ${Cyanish("WeatherGeoCoordinates")} value (if provided)`, () => {
    if (OpenWeather.WeatherGeoCoordinates) {
      if (OpenWeather.WeatherGeoCoordinates.lat) {
        expect(typeof OpenWeather.WeatherGeoCoordinates.lat).toBe("number");
        expect(OpenWeather.WeatherGeoCoordinates.lat).toBeLessThanOrEqual(90);
        expect(OpenWeather.WeatherGeoCoordinates.lat).toBeGreaterThanOrEqual(-90);
      }

      if (OpenWeather.WeatherGeoCoordinates.lon) {
        expect(typeof OpenWeather.WeatherGeoCoordinates.lon).toBe("number");
        expect(OpenWeather.WeatherGeoCoordinates.lon).toBeLessThanOrEqual(180);
        expect(OpenWeather.WeatherGeoCoordinates.lon).toBeGreaterThanOrEqual(-180);
      }
    }
  });
});
