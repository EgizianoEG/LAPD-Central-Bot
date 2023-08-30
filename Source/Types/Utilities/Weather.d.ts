declare namespace WeatherData {
  /**
   * Represents the options for retrieving current weather data.
   */
  declare interface CurrentWeatherOptions {
    Units?: TemperatureUnit;
    Latitude?: number;
    Longitude?: number;
    Formatted?: boolean;
  }

  /**
   * Represents fetched weather data from OpenWeather API.
   */
  declare interface CurrentWeatherData {
    /** The name of the city with the given latitude and longitude */
    city_name: string;

    /** The id number of the city retrieved frim OpenWeather */
    city_id: number;

    /** The object containing all temprature data */
    temp: TemperatureData;
    visibility: string;
    humidity: string;
    pressure: string;
    wind: WindData;
    clouds: CloudData;
    weather: Weather;

    /** Boolean indication whether the current local time of the requested latitude and longitude is day or not */
    is_day: boolean;

    /** The OpenWeather forecast link for the requested city/long-lat */
    forecast_link: string;
  }

  /**
   * Represents weather data retrieved from OpenWeather API.
   */
  declare interface RetrievedWeatherData {
    /** The coordinates of the location. */
    coord: Coordinates;

    /** An array of weather details. */
    weather: Weather[];

    /** The data source. */
    base: string;

    /** The main weather data. */
    main: MainData;

    /** The visibility in meters. */
    visibility: number;

    /** The wind data. */
    wind: WindData;

    /** The cloud data. */
    clouds: CloudData;

    /** The timestamp of the retrieved data. */
    dt: number;

    /** System-related data. */
    sys: SystemData;

    /** The timezone offset in seconds. */
    timezone: number;

    /** The city ID. */
    id: number;

    /** The city name. */
    name: string;

    /** The response code. */
    cod: number;
  }
}

/**
 * Represents temperature data.
 */
interface TemperatureData {
  min: string;
  max: string;
  current: string;
  feels_like: string;
}

/**
 * Represents wind data.
 */
interface WindData {
  speed: string;
  deg: number;
}

/**
 * Represents cloud data.
 */
interface CloudData {
  all: number;
}

/**
 * Represents weather details.
 */
interface Weather {
  /** The weather condition ID. */
  id: number;

  /** The main weather category. */
  main: string;

  /** The description of the weather condition. */
  description: string;

  /** The weather icon ID. */
  icon: string;
}

/**
 * Represents main weather data.
 */
interface MainData {
  temp: string;
  feels_like: string;
  temp_min: string;
  temp_max: string;
  pressure: string;
  humidity: string;
}

/**
 * Represents geographical coordinates.
 */
interface Coordinates {
  lon: number;
  lat: number;
}

/**
 * Represents system-related data.
 */
interface SystemData {
  type: number;
  id: number;
  country: string;
  sunrise: number;
  sunset: number;
}

/**
 * Represents available units for temperature measurement.
 */
type TemperatureUnit = "metric" | "imperial" | string;
