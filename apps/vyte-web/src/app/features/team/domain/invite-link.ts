/** Address of the page an editor invite opens, for the owner to copy and pass on. */
export function inviteLinkUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/invite/${encodeURIComponent(token)}`;
}
