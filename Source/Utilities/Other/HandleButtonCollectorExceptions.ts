export default async function HandleButtonCollectorExceptions(
  Err: unknown,
  PromptDisabler: () => Promise<any> = () => Promise.resolve()
) {
  if (Err instanceof Error) {
    if (Err.message.match(/reason: time/)) {
      await PromptDisabler();
      return null;
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion */
      return null;
    } else {
      throw Err;
    }
  }
}
