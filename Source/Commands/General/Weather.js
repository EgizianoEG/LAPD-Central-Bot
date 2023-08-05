// eslint-disable-next-line no-unused-vars
const {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  formatEmoji,
  Colors,
} = require("discord.js");

const GetWeatherIcon = require("../../Utilities/General/GetWeatherIcon");
const { default: Axios } = require("axios");
const { convert: Convert } = require("convert");
const { OpenWeatherAPI } = require("openweather-api-node");
const { Icons } = require("../../Json/Shared.json");
const {
  OpenWeather: { API_Key, WeatherGeoCoordinates: Coor },
} = require("../../Json/Secrets.json");

const WeatherAPI = Axios.create({
  baseURL: "https://api.openweathermap.org/data/2.5/weather",
  params: {
    lat: Coor.lat ?? 34.052235,
    lon: Coor.lon ?? -118.243683,
    appid: API_Key,
  },
});
// -------------------------------------------------------------------------------

/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  const Units = Interaction.options.getString("units") ?? "imperial";

  const WeatherData = await WeatherAPI.request({
    params: {
      units: Units,
    },
  }).then((Res) => Res.data);

  const DegreeUnit = Units === "metric" ? " °C" : " °F";
  const SpeedUnit = Units === "metric" ? " m/s" : " mph";
  const DistanceUnit = Units === "metric" ? "km" : "mi";
  const VisibilityDistance = Convert(WeatherData.visibility, "m").to(DistanceUnit);
  console.log(WeatherData);

  const WeatherEmbed = new EmbedBuilder()
    .setURL("https://openweathermap.org/city/5368361")
    .setTitle("<:losangeles:1134606469828984873> Weather")
    .setColor(Colors.Greyple)
    .setDescription("Current weather in city of Los Angeles, California\n" + "Local Time: " + "")
    .setFooter({ text: "Powered by OpenWeather", iconURL: Icons.OpenWeather })
    .setThumbnail(GetWeatherIcon(WeatherData.weather[0].id))
    .setTimestamp()
    .setFields(
      {
        name: "Condition",
        value: WeatherData.weather[0].main,
        inline: true,
      },
      {
        name: "Temperature",
        value: Math.round(WeatherData.main.temp) + DegreeUnit,
        inline: true,
      },
      {
        name: "Feels Like",
        value: Math.round(WeatherData.main.feels_like) + DegreeUnit,
        inline: true,
      },
      {
        name: "Humidity",
        value: WeatherData.main.humidity + "%",
        inline: true,
      },
      {
        name: "Wind Speed",
        value: WeatherData.wind.speed + SpeedUnit,
        inline: true,
      },
      {
        name: "Visibility",
        value: `~${parseFloat(VisibilityDistance.toFixed(1))} ${DistanceUnit}`,
        inline: true,
      }
    );

  return Interaction.reply({ embeds: [WeatherEmbed] });
}

const CommandObject = {
  callback: Callback,
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Check the current weather in the city of Los Angeles.")
    .addStringOption((Option) =>
      Option.setName("units")
        .setDescription("Units of measurement.")
        .addChoices({ name: "metric", value: "metric" }, { name: "imperial", value: "imperial" })
    ),
};

// ----------------------------
module.exports = CommandObject;
