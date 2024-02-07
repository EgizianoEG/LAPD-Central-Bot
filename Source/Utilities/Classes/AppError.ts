import type { ErrorMessages } from "@Resources/AppMessages.js";
export interface AppErrorOptions {
  /** [Currently Unused] Error code; defaults to `0`.
   *   - `0`: Normal/Generic error,
   *   - `1`: Warning manner,
   *   - `2`: Unauthorized.
   */
  Code?: number;

  /** The title for the error. This is mainly used for errors showed in embeds; defaults to "Application Error". */
  Title?: string;

  /** The error message and description; defaults to "Unknown Error". */
  Message?: string;

  /** Whether or not the error can be shown to the end user; defaults to `false`. */
  Showable?: boolean;

  /** Custom stack trace to set. */
  Stack?: string;

  /** A predefined template to use for title and message properties. */
  Template?: keyof typeof ErrorMessages;
}

export default class AppError extends Error {
  is_showable: boolean;
  title: string;
  code: number;

  /**
   * The extended error class that should be used around the application/bot codebase.
   * @param Options - Optional things to include in the error class.
   */
  constructor(Options: AppErrorOptions) {
    super(Options.Message);

    this.name = "AppError";
    this.code = Options.Code ?? 0;
    this.title = Options.Title ?? "Application Error";
    this.message = Options.Message ?? "Unknown Error";
    this.is_showable = !!Options.Showable;

    if (Options.Stack) {
      this.stack = Options.Stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
