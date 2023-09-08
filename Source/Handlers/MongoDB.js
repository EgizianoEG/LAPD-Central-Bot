const Chalk = require("chalk");
const Mongoose = require("mongoose");
const { MongoDB } = require("../Config/Secrets.json");
// ---------------------------------------------------------------------

module.exports = async () => {
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
