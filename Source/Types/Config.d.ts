import { ColorResolvable } from "discord.js";

declare global {
  /** All data that are private and kept secret from public */
  declare namespace Config {
    declare interface Secrets {
      /** A container for all related Discord secret values. */
      Discord: Discord;

      /** A container for all related MongoDB secret values. */
      MongoDB: MongoDB;

      /** A container for all related OpenWeather secret values. */
      OpenWeather: OpenWeather;

      /** A container for all related Roblox secret values. */
      Roblox: Roblox;
    }

    interface Discord {
      /**
       * An array containing all developers’ IDs of the bot. This will be used to provide some
       * functionalities and special commands.
       */
      BotDevs: string[];

      /**
       * The server’s snowflake ID; a server that will be used to test the bot and to allow
       * specific development commands for it.
       */
      TestGuildID: string;

      /** The bot token for the Discord application (Bot). */
      BotToken: string;

      /** The application’s (bot’s) snowflake ID. */
      ClientID: string;
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
      lat: number;

      /** The longitude of the location. */
      lon: number;
    }

    interface Roblox {
      /** The Cookie of the account of which will be used to access certain Roblox APIs. Recomended not to be your main account. */
      Cookie: string;
    }
  }
}
