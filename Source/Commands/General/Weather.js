// eslint-disable-next-line no-unused-vars
const {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  formatEmoji,
  Colors,
} = require("discord.js");

const { Axios } = require("axios");
const { convert: Convert } = require("convert");
const { OpenWeatherAPI } = require("openweather-api-node");
const { Icons } = require("../../Json/Shared.json");
const {
  OpenWeather: { API_Key },
} = require("../../Json/Secrets.json");

const Weather = new OpenWeatherAPI({
  key: API_Key,
  coordinates: { lat: 34.052235, lon: -118.243683 },
  units: "imperial",
  // locationName: "Los Angeles",
});
// -------------------------------------------------------------------------------

/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  const Units = Interaction.options.getString("units") ?? "imperial";
  const { weather: WeatherData, dt, timezone } = await Weather.getCurrent({ units: Units });

  const axios = new Axios({ method: "GET" });
  axios
    .get("https://api.openweathermap.org/data/2.5/weather", {
      params: {
        lat: 34.052235,
        lon: -118.243683,
        appid: API_Key,
        units: Units,
      },
    })
    .then((Res) => {
      // console.log(Res.data);
    });

  const DegreeUnit = Units === "metric" ? " °C" : " °F";
  const SpeedUnit = Units === "metric" ? " m/s" : " mph";
  const DistanceUnit = Units === "metric" ? "km" : "mi";
  const VisibilityDistance = Convert(WeatherData.visibility, "m").to(DistanceUnit);

  const WeatherEmbed = new EmbedBuilder()
    .setURL("https://openweathermap.org/city/5368361")
    .setTitle("<:losangeles:1134606469828984873> Weather")
    .setColor(Colors.Greyple)
    .setDescription("Current weather in city of Los Angeles, California\n" + "Local Time: " + "")
    .setFooter({ text: "Powered by OpenWeather", iconURL: Icons.OpenWeather })
    .setThumbnail("https://i.ibb.co/qLGgvyh/clear-day.gif")
    .setTimestamp()
    .setFields(
      {
        name: "Condition",
        value: WeatherData.main,
        inline: true,
      },
      {
        name: "Temperature",
        value: Math.round(WeatherData.temp.cur) + DegreeUnit,
        inline: true,
      },
      {
        name: "Feels Like",
        value: Math.round(WeatherData.feelsLike.cur) + DegreeUnit,
        inline: true,
      },
      {
        name: "Humidity",
        value: WeatherData.humidity + "%",
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
        .addChoices({ name: "Metric", value: "metric" }, { name: "Imperial", value: "imperial" })
    ),
};

// ----------------------------
module.exports = CommandObject;
