import type { Secrets } from "@Typings/Config.js";

export const Discord: Secrets.Discord = {
  ClientId: "10918796117460245810",
  BotToken: "MTA5Nzg3OTYxMTc0NjAyOTcxMA.G3NsSn.cqsdmmAmnqeUe_PT7ROQAzWzWZA3nzFfN_xHWI",
  TestGuildId: "299142369297356",
  BotDevs: ["792228590451603", "7236923635792345", "090408080567741", "45515157287732599227"],
};

export const Roblox: Secrets.Roblox = {
  Cookie:
    "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_E1AF31BAF5C56681D1C319598C960EFA668477AD0AA07E2F03C92A4FAF4D43A1CBA3548F022D69712885621EDD35AD628875B1C0493D051B702E2921641E21A7FE5368E54CDA9BDF5AA8B4F1319FD7675E7BF2C366FA69B16B44BE95E4BAB10F399F26C44C127ED20009F23E49EB0454DAEBBE497BC1035405E6452A2F73704EC3CE791ECC98664C3609772CB8C9ED223CDD0D09A825579F25B0B7EF390CC66DE8D21D281B1DEDA504EF0C68F6FBB2A6814E0E13CEDCAD09EFA44FC66297D23ECAD44043F01A5D2D28FE53A55B3E80852F8C7DC0BDD08FF7A29D09C4E0C930DFEF5B6EFEFD3B31D22264DAAF7AE2C32FF1543AFD94503DBC7150368D6FC6C143FA0C6A19AC15E14A86CD7F7337EABD12778F11F8E7F8B8A7DE009A0A168F109431B90B2B",
};

export const MongoDB: Secrets.MongoDB = {
  URI: "mongodb+srv://<username>:<password>@lapd-central-bot.rdjesxr.mongodb.net/?retryWrites=true&w=majority",
  Username: "Data-Admin",
  UserPass: "jDnQiJ1DEz26L1fS",
  DBName: "bot-database",
};

export const OpenWeather: Secrets.OpenWeather = {
  API_Key: "095350bf11438685a23221485e7d3b8e",
  WeatherGeoCoordinates: {
    lat: 34.0393,
    lon: -118.2693,
  },
};

export default {
  Discord,
  Roblox,
  MongoDB,
  OpenWeather,
} as Secrets.Config;