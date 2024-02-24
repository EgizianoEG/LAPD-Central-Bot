import type { ErrorMessages } from "@Resources/AppMessages.js";
export interface AppErrorOptions {
  /** Error code; defaults to `1`.
   *   - `0`: A fatal error,
   *   - `1`: Non-fatal error,
   *   - `2`: Warning matter error.
   */
  code?: 0 | 1 | 2;

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
  readonly is_showable: boolean = false;
  readonly name: string = "AppError";
  readonly title: string = "Application Error";
  readonly message: string = "An unspecified error occurred.";
  readonly code: number = 1;

  /**
   * The extended error class that should be used around the application/bot codebase.
   * @param Options - Optional things to include in the error class.
   */
  constructor(Options: AppErrorOptions) {
    super(Options.message);

    this.code = Options.code ?? this.code;
    this.title = Options.title ?? this.title;
    this.message = Options.message ?? this.message;
    this.is_showable = !!Options.showable;

    if (Options.stack) {
      this.stack = Options.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
