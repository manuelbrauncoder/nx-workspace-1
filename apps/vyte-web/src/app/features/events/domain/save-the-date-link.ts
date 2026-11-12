/** Address of the public save-the-date page, for the hosts to copy and pass on. */
export function saveTheDateUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/save-the-date/${encodeURIComponent(token)}`;
}
