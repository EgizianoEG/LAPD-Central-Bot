// Dependencies:
// -------------

const { default: Axios } = require("axios");
const { OpenWeather } = require("../../Config/Secrets.json");
const Convert = require("convert-units");

const WeatherClient = Axios.create({
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
 * @param {Convert.Unit} DistanceUnit The targeted distance unit
 * @return {Number} The converted visibility distance
 */
function ConvertVisibility(RawVisibility, DistanceUnit) {
  return parseFloat(Convert(RawVisibility).from("m").to(DistanceUnit).toFixed(1));
}

/**
 * Retrieves the current weather data for a specified latitude and longitude or for the default city, Los Angeles via OpenWeather API.
 * @param {WeatherData.CurrentWeatherOptions} Options Request and returned data options object
 * @returns {Promise<WeatherData.CurrentWeatherData>} The current weather data retreived from OpenWeather organized
 */
async function GetCurrentWeather(Options = { Units: "imperial" }) {
  /** @type {WeatherData.RetrievedWeatherData} */
  const RetrievedData = await WeatherClient.request({
    params: {
      units: Options.Units,
    },
  }).then((Res) => {
    for (const [Key, Value] of Object.entries(Res.data.main)) {
      Res.data.main[Key] = Math.round(Value).toString();
    }
    return Res.data;
  });

  /** @type {Record<string, any>} */
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

  /** @type {any} */
  const WeatherData = {
    city_id: RetrievedData.id,
    city_name: RetrievedData.name,
    temp: Tempratures,
    weather: RetrievedData.weather[0],
    clouds: RetrievedData.clouds,
    wind: RetrievedData.wind,
    humidity: RetrievedData.main.humidity,
    pressure: RetrievedData.main.pressure,
    visibility: ConvertVisibility(RetrievedData.visibility, Units.Distance.trim()),
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
  }

  return WeatherData;
}

// ------------------------------------------------------------------------------------
module.exports = {
  GetCurrentWeather,
};
