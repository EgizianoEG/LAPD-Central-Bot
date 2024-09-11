import { Client, Guild } from "discord.js";
import { addDays } from "date-fns";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GuildModel from "@Models/Guild.js";

/**
 * Schedules the guild data deletion from the database after **3 days** of the client not being in it.
 * @param Client
 * @param CreatedGuild
 */
export default async function ScheduleGuildDataDeletion(Client: Client<true>, GuildInst: Guild) {
  const UpdatedGuildDocument = await GuildModel.findOneAndUpdate(
    {
      _id: GuildInst.id,
      deletion_scheduled_on: null,
    },
    {
      $set: {
        deletion_scheduled_on: addDays(new Date(), 3),
      },
    },
    { new: true, lean: true, projection: { _id: 1 } }
  ).exec();

  if (UpdatedGuildDocument) {
    AppLogger.info({
      message: "Scheduled data deletion for the guild with the id: %s",
      label: "Events:GuildDelete:ScheduleDataDeletion",
      splat: [GuildInst.id],
    });
  }
}
