// -------------
// Dependencies:
// -------------------------------------------------------------------------------
const { default: Axios } = require("axios");
const { OpenWeather } = require("../../Json/Secrets.json");
const Convert = require("convert-units");

const WeatherAPI = Axios.create({
  baseURL: "https://api.openweathermap.org/data/2.5/weather",
  params: {
    lat: 34.052235,
    lon: -118.243683,
    appid: OpenWeather.API_Key,
  },
});

// ------------------------------------------------------------------------------------
// Functions:
// ----------

/**
 * Converts a given visibility in meters
 * @param {Number} RawVisibility Visibility distance in meters from the original request
 * @param {String} DistanceUnit The targeted distance unit
 * @return {Number} The converted visibility distance
 */
function ConvertVisibility(RawVisibility, DistanceUnit) {
  return parseFloat(Convert(RawVisibility).from("m").to(DistanceUnit.trim()).toFixed(1));
}

/**
 * Retrieves the current weather data for a specified latitude and longitude or for the default city, Los Angeles via OpenWeather API.
 * @param {CurrentWeatherOptions} Options Request and returned data options object
 * @returns {Promise<CurrentWeatherData>} The current weather data retreived from OpenWeather organized
 */
async function GetCurrentWeather(Options = { Units: "imperial" }) {
  /** @type {RetrievedWeatherData} */
  const RetrievedData = await WeatherAPI.request({
    params: {
      units: Options.Units,
    },
  }).then((Res) => {
    for (const [Key, Value] of Object.entries(Res.data.main)) {
      Res.data.main[Key] = Math.round(Value);
    }
    return Res.data;
  });

  const Units = {
    Speed: Options.Units === "metric" ? " km/h" : " mph",
    Degree: Options.Units === "metric" ? " °C" : " °F",
    Distance: Options.Units === "metric" ? " km" : " mi",
    Pressure: Options.Units === "metric" ? " hPa" : " psi",
  };

  const Tempratures = {
    min: RetrievedData.main.temp_min,
    max: RetrievedData.main.temp_max,
    current: RetrievedData.main.temp,
    feels_like: RetrievedData.main.feels_like,
  };

  const WeatherData = {
    city_id: RetrievedData.id,
    city_name: RetrievedData.name,
    temp: Tempratures,
    weather: RetrievedData.weather[0],
    clouds: RetrievedData.clouds,
    wind: RetrievedData.wind,
    humidity: RetrievedData.main.humidity,
    pressure: RetrievedData.main.pressure,
    visibility: ConvertVisibility(RetrievedData.visibility, Units.Distance),
    is_day: RetrievedData.weather[0].icon.includes("d"),
    forecast_link: `https://openweathermap.org/city/${RetrievedData.id}`,
  };

  if (Options.Formatted) {
    WeatherData.humidity += "%";
    WeatherData.visibility += Units.Distance;

    for (const Key in WeatherData.temp) {
      WeatherData.temp[Key] += Units.Degree;
    }

    if (Options.Units === "metric") {
      WeatherData.pressure += Units.Pressure;
      WeatherData.wind.speed =
        parseFloat(Convert(WeatherData.wind.speed).from("m/s").to(Units.Speed.trim()).toFixed(1)) +
        Units.Speed;
    } else {
      WeatherData.wind.speed += Units.Speed;
      WeatherData.pressure =
        parseFloat(Convert(WeatherData.pressure).from("hPa").to(Units.Pressure.trim()).toFixed(1)) +
        Units.Pressure;
    }
    return WeatherData;
  } else {
    return WeatherData;
  }
}

// ------------------------------------------------------------------------------------
module.exports = {
  GetCurrentWeather,
};

// ------------------------------------------------------------------------------------
// Types:
// ------
/**
 * @typedef {Object} CurrentWeatherOptions
 * @property {("metric"|"imperial")} [Units = "imperial"]
 * @property {Number} [Latitude]
 * @property {Number} [Longitude]
 * @property {Boolean} [Formatted] Should suffixes be added? e.g. "10 km/h" or "36 °C"
 */

/**
 * Fetched weather data from OpenWeather API
 * @typedef {Object} CurrentWeatherData
 * @property {String} city_name The name of the city with the given latitude and longitude
 * @property {Number} city_id The id number of the city retrieved frim OpenWeather
 * @property {Object} temp The object containing all temprature data
 * @property {Number|String} temp.min
 * @property {Number|String} temp.max
 * @property {Number|String} temp.current
 * @property {Number|String} temp.feels_like
 * @property {Number|String} visibility
 * @property {Number|String} humidity
 * @property {Number|String} pressure
 * @property {Object} wind
 * @property {Number|String} wind.speed
 * @property {Number} wind.deg
 * @property {CloudData} clouds
 * @property {Weather} weather
 * @property {Boolean} is_day Boolean indication whether the current local time of the requested latitude and longitude is day or not
 * @property {String} forecast_link The OpenWeather forecast link for the requested city/long-lat
 */

/**
 * Represents weather data.
 * @typedef {Object} RetrievedWeatherData
 * @property {Coordinates} coord - The coordinates of the location.
 * @property {Weather[]} weather - An array of weather details.
 * @property {string} base - The data source.
 * @property {MainData} main - The main weather data.
 * @property {number} visibility - The visibility in meters.
 * @property {WindData} wind - The wind data.
 * @property {CloudData} clouds - The cloud data.
 * @property {number} dt - The timestamp of the data.
 * @property {SystemData} sys - System-related data.
 * @property {number} timezone - The timezone offset in seconds.
 * @property {number} id - The city ID.
 * @property {string} name - The city name.
 * @property {number} cod - The response code.
 */

/**
 * Represents geographical coordinates.
 * @typedef {Object} Coordinates
 * @property {number} lon - The longitude.
 * @property {number} lat - The latitude.
 */

/**
 * Represents weather details.
 * @typedef {Object} Weather
 * @property {number} id - The weather condition ID.
 * @property {string} main - The main weather category.
 * @property {string} description - The description of the weather condition.
 * @property {string} icon - The weather icon ID.
 */

/**
 * Represents main weather data.
 * @typedef {Object} MainData
 * @property {number} temp - The temperature.
 * @property {number} feels_like - The "feels like" temperature.
 * @property {number} temp_min - The minimum temperature.
 * @property {number} temp_max - The maximum temperature.
 * @property {number} pressure - The atmospheric pressure in hPa.
 * @property {number} humidity - The relative humidity in percentage.
 */

/**
 * Represents wind data.
 * @typedef {Object} WindData
 * @property {number} speed - The wind speed.
 * @property {number} deg - The wind direction in degrees.
 */

/**
 * Represents cloud data.
 * @typedef {Object} CloudData
 * @property {number} all - The cloudiness percentage.
 */

/**
 * Represents system-related data.
 * @typedef {Object} SystemData
 * @property {number} type - The type of system data.
 * @property {number} id - The system data ID.
 * @property {string} country - The country code.
 * @property {number} sunrise - The sunrise timestamp.
 * @property {number} sunset - The sunset timestamp.
 */

/**
 * Represents an Axios response.
 *
 * @template T - The type of the response data.
 * @typedef {Object} AxiosResponse
 * @property {T} data - The response data.
 * @property {number} status - The HTTP status code.
 * @property {string} statusText - The status message.
 * @property {RawAxiosResponseHeaders | AxiosResponseHeaders} headers - The response headers.
 * @property {InternalAxiosRequestConfig<D>} config - The Axios request configuration.
 * @property {*} [request] - The original request.
 */
