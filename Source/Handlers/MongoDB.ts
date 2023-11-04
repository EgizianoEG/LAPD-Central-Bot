import Mongoose from "mongoose";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import { MongoDB } from "@Config/Secrets.js";

export default async () => {
  const DatabaseURI = MongoDB.URI.replace(
    /(<username>):(<password>)/g,
    `${MongoDB.Username}:${MongoDB.UserPass}`
  );

  Mongoose.connect(DatabaseURI, {
    dbName: MongoDB.DBName,
  })
    .then(() => {
      AppLogger.info({
        message: "Connection to MongoDB has been established.",
        label: "Handlers:MongoDB",
      });
    })
    .catch((Err) => {
      AppLogger.error({
        message: "An error occurred while connecting to MongoDB;",
        label: "Handlers:MongoDB",
        stack: Err.stack,
        ...Err,
      });
    });
};
