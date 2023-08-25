declare interface ErrorReplyOptions {
  /** The repliable interaction */
  Interact: RepliableInteraction;

  /** Whether this reply is ephemeral or publicly visible */
  Ephemeral?: boolean;

  /** The title of the error reply; defaults to "Error" */
  Title?: string;

  /** The description of the error reply */
  Message?: string;

  /** A pre-defined template with title and description to use instead of providing `Title` and `Description` options. `Ephemeral` option is still respected. */
  Template?: "AppError";
}
