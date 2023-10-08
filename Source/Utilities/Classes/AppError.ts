export default class AppError extends Error {
  title: string;
  code: number;

  /**
   * @param Title
   * @param Message
   * @param Code - Error code. 0: Normal, 1: Warning Manner, 2: Unauthorized.
   */
  constructor(Title: string, Message: string, Code: number = 0) {
    super(Message);
    const Mask = Error.call(this, Message);

    this.name = "AppError";
    this.code = Code;
    this.title = Title;
    this.message = Mask.message;
    this.stack = Mask.stack;
  }
}
