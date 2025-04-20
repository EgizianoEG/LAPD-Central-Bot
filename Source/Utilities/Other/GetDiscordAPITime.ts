/**
 * Gets the current time from Discord's API by checking the 'date' header.
 * @returns
 */
export default async function GetDiscordAPITime(): Promise<Date> {
  const APIResp = await fetch("https://discord.com/api/v10/gateway", {
    method: "HEAD",
  }).catch(() => null);

  const DateHeader = APIResp?.headers.get("date");
  if (DateHeader) {
    return new Date(DateHeader);
  }

  return new Date();
}
