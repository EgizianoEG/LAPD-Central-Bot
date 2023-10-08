import Path from "node:path";
import FileSystem from "node:fs";

/** Returns child file/folder paths (files with `.js` extension) for a given directory */
export default (Directory: string, FoldersOnly = false) => {
  const Files = FileSystem.readdirSync(Directory, { withFileTypes: true });
  const Paths: string[] = [];

  for (const File of Files) {
    const FilePath = Path.join(Directory, File.name);
    const ExtName = Path.extname(File.name);

    if (FoldersOnly) {
      if (File.isDirectory()) {
        Paths.push(FilePath);
      }
    } else if (File.isFile() && (ExtName === ".js" || ExtName === ".ts")) {
      Paths.push("file://" + FilePath);
    }
  }

  return Paths;
};
