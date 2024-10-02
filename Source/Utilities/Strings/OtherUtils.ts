/**
 * Sanitizes a given attachment URL by removing any query parameters that are not related to authentication params.
 * @param Link - The URL string to be sanitized. Must be a valid link.
 * @returns The sanitized URL string with only the allowed query parameters.
 */
export function SanitizeDiscordAttachmentLink(Link: string): string {
  const URLInst = new URL(Link);
  const AllowedParams = new Set(["ex", "is", "hm"]);

  for (const Param of URLInst.searchParams.keys()) {
    if (!AllowedParams.has(Param)) {
      URLInst.searchParams.delete(Param);
    }
  }

  return URLInst.href;
}
