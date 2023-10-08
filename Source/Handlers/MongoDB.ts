import Chalk from "chalk";
import Mongoose from "mongoose";
import { MongoDB } from "@Config/Secrets.json";

export default async () => {
  const DatabaseURI = MongoDB.URI.replace(/<username>/, MongoDB.Username).replace(
    /<password>/,
    MongoDB.UserPass
  );

  Mongoose.connect(DatabaseURI, {
    dbName: MongoDB.DBName,
  })
    .then(async () => {
      console.log("✅ - %s is connected.", Chalk.cyanBright.bold("MongoDB"));
    })
    .catch((Err) => console.log("❎ - An error occurred while connecting to MongoDB:", Err));
};
