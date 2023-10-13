import Chalk from "chalk";
import Mongoose from "mongoose";
import { MongoDB } from "@Config/Secrets.js";

export default async () => {
  const DatabaseURI = MongoDB.URI.replace(
    /(<username>):(<password>)/g,
    `${MongoDB.Username}:${MongoDB.UserPass}`
  );

  Mongoose.connect(DatabaseURI, {
    dbName: MongoDB.DBName,
  })
    .then(async () => {
      console.log("✅ - %s is connected.", Chalk.cyanBright.bold("MongoDB"));
    })
    .catch((Err) => console.log("❎ - An error occurred while connecting to MongoDB:", Err));
};
