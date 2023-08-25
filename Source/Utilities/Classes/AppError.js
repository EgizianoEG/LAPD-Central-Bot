module.exports = class AppError extends Error {
  /**
   * @param {String} Title Title of the error message
   * @param {String} Message
   * @param {Number} [Code=0] Error code. 0: Normal, 1: Warning Manner, 2: Unauthorized.
   */
  constructor(Title, Message, Code = 0) {
    super(Message);
    const Mask = Error.call(this, Message);

    this.name = "AppError";
    this.code = Code;
    this.title = Title;
    this.message = Mask.message;
    this.stack = Mask.stack;
  }
};
