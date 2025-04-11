import { Types } from "mongoose";
import { GuildIncidents } from "@Typings/Utilities/Database.js";
import IncidentModel from "@Models/Incident.js";

export default async function GetIncidentRecord(
  Guild: string,
  IncidentDatabaseId: string | Types.ObjectId
): Promise<GuildIncidents.IncidentRecord | null> {
  const SearchLabel =
    typeof IncidentDatabaseId === "string" && IncidentDatabaseId.includes("-") ? "num" : "_id";

  return IncidentModel.findOne({ guild: Guild, [SearchLabel]: IncidentDatabaseId }, undefined, {
    lean: true,
  }).exec();
}
