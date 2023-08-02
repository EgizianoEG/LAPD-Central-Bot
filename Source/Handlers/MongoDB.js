const Chalk = require("chalk");
const Mongoose = require("mongoose");
const {
  MongoDB: { URI, Username, UserPass, DBName },
} = require("../Json/Secrets.json");
// ---------------------------------------------------------------------

module.exports = async () => {
  const DatabaseURI = URI.replace(/<username>/, Username).replace(/<password>/, UserPass);

  Mongoose.connect(DatabaseURI, {
    dbName: DBName,
  })
    .then(async () => {
      console.log("✅ - %s is connected.", Chalk.cyanBright.bold("MongoDB"));
    })
    .catch((Err) => console.log("❎ - An error occurred while connecting to MongoDB:", Err));
};
