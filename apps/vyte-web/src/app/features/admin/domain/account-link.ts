/** Address of the page an account link opens, for the admin to copy and pass on. */
export function accountLinkUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/welcome/${encodeURIComponent(token)}`;
}
