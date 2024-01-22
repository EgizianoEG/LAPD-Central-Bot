import type { ColorResolvable } from "discord.js";

export namespace Secrets {
  interface Config {
    /** A container for all related Discord secret values. */
    Discord: Discord;

    /** A container for all related MongoDB secret values. */
    MongoDB: MongoDB;

    /** ImgBB related values */
    ImgBB: ImgBB;

    /** A container for all related Roblox secret values. */
    Roblox: Roblox;

    /** A container for all related OpenWeather secret values. */
    OpenWeather: OpenWeather;
  }

  interface Roblox {
    /** The Cookie of the account of which will be used to access certain Roblox APIs. Recommended not to be your main account. */
    Cookie: string;
  }

  interface Discord {
    /**
     * An array containing all developers’ IDs of the bot. This will be used to provide some
     * functionalities and special commands.
     */
    BotDevs: string[];

    /**
     * Whitelisted guilds that the bot will be able to join.
     * A `null` or `undefined` value means that the bot will be able to join any server.
     * An empty array means that the bot will not be able to join any server except the one declared in `TestGuildId`.
     */
    WLGuilds?: string[] | null;

    /**
     * The supporting server's snowflake Id.
     * If not provided, the `TestGuildId` will be used as the support server, too.
     */
    SupportGuildId?: string | null;

    /**
     * The server’s snowflake ID; a server that will be used to test the bot and to allow
     * specific development commands for it.
     */
    TestGuildId: string;

    /** The bot token for the Discord application (Bot). */
    BotToken: string;
  }

  interface MongoDB {
    /** The connection string excluding the username, password, and database name from it. */
    URI: string;

    /** The database to use of your cluster. This is not supposed to be the cluster name. */
    DBName: string;

    /** Your MongoDB user’s name that will provide read and write access for the specified database. */
    Username: string;

    /** Your MongoDB user’s password that will provide read and write access for the specified database. */
    UserPass: string;
  }

  interface ImgBB {
    API_Key: string;
  }

  interface OpenWeather {
    /**
     * The API key provided from OpenWeather.
     * This will be used to retrieve weather and forecast data from OpenWeather’s API.
     * No paid plan is required.
     */
    API_Key: string;

    /**
     * Geographical coordinates of the location of which weather will be retrieved. Not a
     * required option;
     * defaults to Los Angeles coordinates.
     */
    WeatherGeoCoordinates?: WeatherGeoCoordinates;
  }

  /**
   * Geographical coordinates of the location of which weather will be retrieved. Not a
   * required option;
   * defaults to Los Angeles coordinates.
   */
  interface WeatherGeoCoordinates {
    /** The latitude of the location. */
    lat: number | string;

    /** The longitude of the location. */
    lon: number | string;
  }
}

declare global {
  namespace Config {
    type Secrets = Secrets.Config;
  }
}
