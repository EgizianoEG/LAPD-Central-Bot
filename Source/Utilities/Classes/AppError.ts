import type { ErrorMessages } from "@Resources/AppMessages.js";
export interface AppErrorOptions {
  /** [Currently Unused] Error code; defaults to `0`.
   *   - `0`: Normal/Generic error,
   *   - `1`: Warning manner,
   *   - `2`: Unauthorized.
   */
  code?: number;

  /** The title for the error. This is mainly used for errors showed in embeds; defaults to "Application Error". */
  title?: string;

  /** The error message and description; defaults to "Unknown Error". */
  message?: string;

  /** Whether or not the error can be shown to the end user; defaults to `false`. */
  showable?: boolean;

  /** Custom stack trace to set. */
  stack?: string;

  /** A predefined template to use for title and message properties. */
  template?: keyof typeof ErrorMessages;
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
    super(Options.message);

    this.name = "AppError";
    this.code = Options.code ?? 0;
    this.title = Options.title ?? "Application Error";
    this.message = Options.message ?? "Unknown Error";
    this.is_showable = !!Options.showable;

    if (Options.stack) {
      this.stack = Options.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
