export default class AppError extends Error {
  title: string;
  code: number;

  /**
   * @param Title - The title for the error. This is mainly used for errors showed in embeds. Defaults to "Application Error".
   * @param Message - The error message and description. Defaults to "Unknown Error".
   * @param Code - Error code. `0`: Normal, `1`: Warning Manner, `2`: Unauthorized. Defaults to `0`.
   */
  constructor(Title?: string, Message?: string, Code: number = 0) {
    super(Message);

    this.name = "AppError";
    this.code = Code;
    this.title = Title ?? "Application Error";
    this.message = Message ?? "Unknown Error";
    Error.captureStackTrace(this, this.constructor);
  }
}
