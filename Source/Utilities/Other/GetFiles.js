const Path = require("path");
const FileSystem = require("fs");

/**
 *
 * @param {String} Directory
 * @param {Boolean} FoldersOnly
 * @returns
 */
module.exports = (Directory, FoldersOnly = false) => {
  const Files = FileSystem.readdirSync(Directory, { withFileTypes: true });
  const Paths = [];

  for (const File of Files) {
    const FilePath = Path.join(Directory, File.name);

    if (FoldersOnly) {
      if (File.isDirectory()) {
        Paths.push(FilePath);
      }
    } else {
      if (File.isFile() && File.name.endsWith(".js")) {
        Paths.push(FilePath);
      }
    }
  }

  return Paths;
};
