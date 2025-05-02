import _Dedent from "dedent";

/**
 * Removes excess unwanted indentation and extra spaces from a given string potentially caused by escaping newlines in a multiline string.
 *
 * This function processes the input string to dedent it and then performs
 * additional cleanup by replacing:
 * - Periods followed by two or more spaces with a single space after the period.
 * - Words separated by two or more spaces with a single space.
 *
 * @param text - The input string to be dedented and cleaned.
 * @returns The processed string with reduced indentation and extra spaces removed.
 */
export default function Dedent(text: string): string {
  return _Dedent(text)
    .replace(/\.[^\S\r\n]{2,}(\w)/g, ". $1")
    .replace(/(\w)[^\S\r\n]{2,}(\w)/g, "$1 $2");
}
