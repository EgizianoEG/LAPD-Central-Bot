import { type ColorResolvable, Colors as DiscordColors } from "discord.js";
import { env as Env } from "node:process";

/**
 * Environment variable override for emoji configurations.
 *
 * @description
 * This allows customizing emoji IDs through an environment variable.
 * The APP_EMOJIS environment variable must be a JSON string that:
 * - Contains all the same keys as the default Emojis object
 * - Can use single quotes (which will be converted to double quotes)
 * - Is at least 1300 characters long to ensure it's kind of valid
 *   Emojis object when parsed with all the keys existing
 *
 * @example
 * ```py
 * # Example environment variable format:
 * APP_EMOJIS='{"Online":"<:CustomOnline:1234567890>","Offline":"<:CustomOffline:1234567890>",...}'
 * ```
 */
let EnvAppEmojis: typeof SharedData.Emojis | null = null;
try {
  EnvAppEmojis =
    Env.APP_EMOJIS && Env.APP_EMOJIS.length >= 1300
      ? (JSON.parse(Env.APP_EMOJIS.replace(/['"]+/g, '"')) as typeof SharedData.Emojis)
      : null;
} catch {
  EnvAppEmojis = null;
}

const SharedData = {
  Images: {
    LAPD_Logo: "https://i.ibb.co/HxqT7Xz/LAPD-Logo-2.png",
    LAPD_Header: "https://i.ibb.co/fXsLH03/LAPD-Header-500.jpg",

    // Credits goes to Sapphire bot for that divider :)
    FooterDivider: "https://i.ibb.co/6HWMHFS/Horizontal-Divider.png",
  },

  Colors: {
    Info: "#3498DB",
    Success: "#28a745",
    Warning: "#E67E22",
    Error: "#ED4245",
    RealGold: "#FFBC45",

    ShiftOn: "#1F9D4B",
    ShiftOff: "#DB2626",
    ShiftVoid: "#4E5052",
    ShiftBreak: "#FE8C2A",
    ShiftNatural: "#C2D1E6",

    // Cancelled color is only used in logging messages; leave requests uses LOARequestDenied when cancelled.
    LOARequestCancelled: "#C2D1E6",
    LOARequestEnded: "#CA2222",
    LOARequestDenied: "#CA2222",
    LOARequestPending: "#F2A265",
    LOARequestApproved: "#227F46",

    ...DiscordColors,
  },

  Thumbs: {
    Info: "https://i.ibb.co/Fztk9dQ/Info-Icon-48.png",
    Warning: "https://i.ibb.co/D9ffPMx/Warning-Icon-48.png",
    Error: "https://i.ibb.co/tqk15t2/Error-Icon-48.png",
    Success: "https://i.ibb.co/TmYLkf4/Checkmark-Icon-48.png",
    Unauthorized: "https://i.ibb.co/DYM3Wcq/Blocked-Icon-48.png",

    AvatarMale: "https://i.ibb.co/m0fyKh1/Male-Avatar-Placeholder.png",
    AvatarFemale: "https://i.ibb.co/Lr37RGx/Female-Avatar-Placeholder.png",

    RobloxAvatarMale: "https://i.ibb.co/LzrzMwr2/Roblox-Thumb-Male-Unknown.png",
    RobloxAvatarFemale: "https://i.ibb.co/pB1wLmhY/Roblox-Thumb-Female-Unknown.png",

    UnknownImage: "https://placehold.co/254x254/F7F8F9/202428/png?text=%3F",
    Transparent: "https://i.ibb.co/qFtywJK/Transparent.png",
  },

  // Attribution & Credits;
  // Some of these icons are from the following sources: Flaticon, Iconfinder, Iconscout, and Icons8
  // Some other icons have been modified or created from scratch.
  Emojis: {
    Online: "<:Online:1373764161468891269>",
    Offline: "<:Offline:1373764162810806374>",
    Idle: "<:Idle:1373764160214794272>",

    Notes: "<:Notes:1373764185682477106>",
    PoliceHat: "<:PoliceHat:1373764188165636241>",
    Eyewitness: "<:Eyewitness:1373764175414693958>",
    Fingerprint: "<:Fingerprint:1373764184076193822>",
    StatusChange: "<:StatusWhite:1373764190015324291>",

    FileEdit: "<:DocumentEdit:1373764144133574770>",
    FileDelete: "<:FileDelete:1373764154669666314>",
    Trash: "<:Trash:1373764164224549126>",
    LoadingGrey: "<a:DualRingGrey:1373765006436335708>",
    LoadingBlue: "<a:DualRingBlue:1373764972932370492>",
    LoadingGold: "<a:DualRingGold:1373764632841552023>",

    GearColored: "<:GearColored:1373764156209102989>",
    MediaStop: "<:MediaStop:1373764187146293308>",
    WhitePlus: "<:WhitePlus:1373764197766402202>",
    WhiteCheck: "<:WhiteCheck:1373764196445192233>",
    WhiteCross: "<:WhiteCross:1373764199238598667>",
    WhiteBack: "<:TurnBack:1373764194020884580>",
    StopWatch: "<:StopWatch:1373764158700392572>",
    LosAngeles: "<:LosAngeles:1373764157450485891>",
    HamburgerList: "<:HamburgerMenu:1373764176702476389>",

    TimeClockIn: "<:TimeClockIn:1373764191328141403>",
    TimeClockOut: "<:TimeClockOut:1373764192607277067>",
    TimeClockPause: "<:TimeClockPause:1373764195341959229>",

    ClockPlus: "<:ClockPlus:1373764171333894214>",
    ClockMinus: "<:ClockMinus:1373764170004037672>",
    ClockReset: "<:ClockReset:1373764172646715462>",
    ClockSet: "<:ClockSet:1373764173925974258>",

    NavNext: "<:ArrowForward:1373764168661860455>",
    NavPrev: "<:ArrowBackward:1373764200786296992>",
    NavFirst: "<:ArrowFirst:1373764165604343891>",
    NavLast: "<:ArrowLast:1373764166980079687>",
  },

  Icons: {
    Signature: "https://i.ibb.co/LrjhMS6/Sign-Icon-50.png",
    OpenWeather: "https://i.ibb.co/CPPbHPL/Open-Weather-48.png",

    Weather: {
      Animated: [
        "https://i.ibb.co/HtXrGDW/mist.gif",
        "https://i.ibb.co/sQBk6KH/hail.gif",
        "https://i.ibb.co/FqrYXms/sleet.gif",
        "https://i.ibb.co/2N7nhr9/cloudy.gif",
        "https://i.ibb.co/R7YvGB8/tornado.gif",
        "https://i.ibb.co/YckP8fD/fog-day.gif",
        "https://i.ibb.co/tz024r8/drizzle.gif",
        "https://i.ibb.co/tCBGwMx/overcast.gif",
        "https://i.ibb.co/Xy1pyCV/haze-day.gif",
        "https://i.ibb.co/q56MmbD/dust-day.gif",
        "https://i.ibb.co/xCB7PPC/fog-night.gif",
        "https://i.ibb.co/SBmZPwf/clear-day.gif",
        "https://i.ibb.co/5sPYP9s/haze-night.gif",
        "https://i.ibb.co/yNVStfp/dust-night.gif",
        "https://i.ibb.co/nR0cJFQ/clear-night.gif",
        "https://i.ibb.co/9bHGRgc/overcast-fog.gif",
        "https://i.ibb.co/f26y7Xm/overcast-day.gif",
        "https://i.ibb.co/ZLF3GR3/thunderstorms.gif",
        "https://i.ibb.co/3FWV3kM/overcast-snow.gif",
        "https://i.ibb.co/QPRvk2g/overcast-rain.gif",
        "https://i.ibb.co/9YdZs1C/overcast-haze.gif",
        "https://i.ibb.co/F68g3nZ/overcast-hail.gif",
        "https://i.ibb.co/yqy5XVV/overcast-smoke.gif",
        "https://i.ibb.co/bdfgrgH/overcast-sleet.gif",
        "https://i.ibb.co/ZMwVThv/overcast-night.gif",
        "https://i.ibb.co/LgyYc3f/overcast-drizzle.gif",
        "https://i.ibb.co/bgzCygW/overcast-day-fog.gif",
        "https://i.ibb.co/3dgYM5R/thunderstorms-day.gif",
        "https://i.ibb.co/TDfQX1G/partly-cloudy-day.gif",
        "https://i.ibb.co/DDK3KX4/overcast-day-snow.gif",
        "https://i.ibb.co/jWLDtJm/overcast-day-rain.gif",
        "https://i.ibb.co/XS78KDZ/overcast-day-haze.gif",
        "https://i.ibb.co/sHQP9wC/overcast-day-hail.gif",
        "https://i.ibb.co/FbzQBNd/thunderstorms-snow.gif",
        "https://i.ibb.co/ySVpH3b/thunderstorms-rain.gif",
        "https://i.ibb.co/8PPggdt/overcast-night-fog.gif",
        "https://i.ibb.co/bv8Cx3C/overcast-day-smoke.gif",
        "https://i.ibb.co/x2jf68G/overcast-day-sleet.gif",
        "https://i.ibb.co/RbKHdp9/thunderstorms-night.gif",
        "https://i.ibb.co/YLp9S2K/partly-cloudy-night.gif",
        "https://i.ibb.co/DKrHQ24/overcast-night-snow.gif",
        "https://i.ibb.co/dB6xXb9/overcast-night-rain.gif",
        "https://i.ibb.co/4KS1dQn/overcast-night-haze.gif",
        "https://i.ibb.co/0mzNnZr/overcast-night-hail.gif",
        "https://i.ibb.co/1dhyhgD/overcast-night-smoke.gif",
        "https://i.ibb.co/CMcYhYX/overcast-night-sleet.gif",
        "https://i.ibb.co/s3tw60L/overcast-day-drizzle.gif",
        "https://i.ibb.co/J3NR52d/partly-cloudy-day-fog.gif",
        "https://i.ibb.co/ZS4tHvb/thunderstorms-overcast.gif",
        "https://i.ibb.co/LxV7KcQ/thunderstorms-day-snow.gif",
        "https://i.ibb.co/Gx3HTQv/thunderstorms-day-rain.gif",
        "https://i.ibb.co/Brd8nZF/partly-cloudy-day-snow.gif",
        "https://i.ibb.co/CBPdDvN/partly-cloudy-day-rain.gif",
        "https://i.ibb.co/nc45MCy/partly-cloudy-day-haze.gif",
        "https://i.ibb.co/HT7Yjck/partly-cloudy-day-hail.gif",
        "https://i.ibb.co/jfTGkqd/overcast-night-drizzle.gif",
        "https://i.ibb.co/8Yk5FN5/partly-cloudy-night-fog.gif",
        "https://i.ibb.co/mCnZhK2/partly-cloudy-day-smoke.gif",
        "https://i.ibb.co/FJXMnDr/partly-cloudy-day-sleet.gif",
        "https://i.ibb.co/M2Sy1Tz/thunderstorms-night-snow.gif",
        "https://i.ibb.co/3mxrVnF/thunderstorms-night-rain.gif",
        "https://i.ibb.co/NSxGqfy/partly-cloudy-night-snow.gif",
        "https://i.ibb.co/6YGkrjP/partly-cloudy-night-rain.gif",
        "https://i.ibb.co/gzS5ZvC/partly-cloudy-night-haze.gif",
        "https://i.ibb.co/svFQf6c/partly-cloudy-night-hail.gif",
        "https://i.ibb.co/rMbNyg5/partly-cloudy-night-smoke.gif",
        "https://i.ibb.co/BztM0sK/partly-cloudy-night-sleet.gif",
        "https://i.ibb.co/51pLNRm/partly-cloudy-day-drizzle.gif",
        "https://i.ibb.co/ZM1HvLk/thunderstorms-day-overcast.gif",
        "https://i.ibb.co/yPXTtFN/thunderstorms-overcast-snow.gif",
        "https://i.ibb.co/jwBWHhM/thunderstorms-overcast-rain.gif",
        "https://i.ibb.co/4mYVPnk/partly-cloudy-night-drizzle.gif",
        "https://i.ibb.co/kyzwK5k/thunderstorms-night-overcast.gif",
        "https://i.ibb.co/6Z7DqBN/thunderstorms-day-overcast-snow.gif",
        "https://i.ibb.co/5WCW2zc/thunderstorms-day-overcast-rain.gif",
        "https://i.ibb.co/9nTsPYD/thunderstorms-night-overcast-snow.gif",
        "https://i.ibb.co/wLWG3cT/thunderstorms-night-overcast-rain.gif",
      ],
    },
  },
};

type ColorsType = Record<keyof typeof SharedData.Colors, ColorResolvable>;
interface SharedConfig extends Omit<typeof SharedData, "Colors"> {
  Colors: ColorsType;
}

/**
 * Apply environment emoji configuration if available.
 *
 * @description
 * This overrides the default emoji configuration with values from the environment.
 * The override mechanism exists because:
 * 1. Discord emoji IDs are server[mutual]-specific
 * 2. Different deployment environments may require different emoji sets
 * 3. It allows customization without code changes
 */
SharedData.Emojis = EnvAppEmojis ?? SharedData.Emojis;
export const Icons = SharedData.Icons;
export const Emojis = SharedData.Emojis;
export const Images = SharedData.Images;
export const Thumbs = SharedData.Thumbs;
export const Colors = SharedData.Colors as ColorsType;
export default SharedData as SharedConfig;
