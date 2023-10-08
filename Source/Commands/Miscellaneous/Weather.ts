// Dependencies:
// -------------
import GetWeatherIcon from "@Utilities/Other/GetWeatherIcon.js";
import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { GetCurrentWeather } from "@Utilities/Other/WeatherData.js";
import { Icons, Emojis } from "@Config/Shared.js";
// ---------------------------------------------------------------------------------------

/**
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"raw">) {
  const Units: any = Interaction.options.getString("units") ?? "imperial";
  const WeatherData = await GetCurrentWeather({ Formatted: true, Units });
  const LocalDateTime = new Date().toLocaleString(["en-US"], {
    timeZone: "America/Los_Angeles",
    dateStyle: "full",
    timeStyle: "short",
  });

  const WeatherEmbed = new EmbedBuilder()
    .setURL(WeatherData.forecast_link)
    .setTitle(Emojis.LosAngeles + "\u{2000}Weather")
    .setColor(Colors.Greyple)
    .setDescription("Current weather in city of Los Angeles, California\n")
    .setFooter({ text: "Powered by OpenWeather", iconURL: Icons.OpenWeather })
    .setThumbnail(GetWeatherIcon(WeatherData.weather.id, WeatherData.is_day))
    .setTimestamp()
    .setFields(
      {
        name: "Date and Time",
        value: LocalDateTime,
      },
      {
        name: "Condition",
        value: WeatherData.weather.main,
        inline: true,
      },
      {
        name: "Temperature",
        value: WeatherData.temp.current,
        inline: true,
      },
      {
        name: "Feels Like",
        value: WeatherData.temp.feels_like,
        inline: true,
      },
      {
        name: "Humidity",
        value: WeatherData.humidity,
        inline: true,
      },
      {
        name: "Wind Speed",
        value: WeatherData.wind.speed,
        inline: true,
      },
      {
        name: "Visibility",
        value: `~${WeatherData.visibility}`,
        inline: true,
      }
    );

  return Interaction.reply({ embeds: [WeatherEmbed] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<any> = {
  callback: Callback,
  options: { cooldown: 30 },
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Check the current weather in the city of Los Angeles.")
    .addStringOption((Option) =>
      Option.setName("units").setDescription("Units of measurement.").addChoices(
        {
          name: "metric",
          value: "metric",
        },
        {
          name: "imperial",
          value: "imperial",
        }
      )
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
