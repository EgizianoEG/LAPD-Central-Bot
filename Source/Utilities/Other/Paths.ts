import Path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A polyfill to commonjs `__filename` global variable
 * @param MetaUrl - The import statement meta url value (`import.meta.url`)
 * @returns
 */
export function GetFileName(MetaUrl: string) {
  return fileURLToPath(MetaUrl);
}

/**
 * A polyfill to commonjs `__dirname` global variable
 * @param MetaUrl - The import statement meta url value (`import.meta.url`)
 * @requires {@link GetFileName Paths.GetFileName()}
 * @returns
 */
export function GetDirName(MetaUrl: string) {
  return Path.dirname(GetFileName(MetaUrl));
}

export default {
  GetFileName,
  GetDirName,
};
