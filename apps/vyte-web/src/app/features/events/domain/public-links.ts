/** Address of the public save-the-date page, for the hosts to copy and pass on. */
export function saveTheDateUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/save-the-date/${encodeURIComponent(token)}`;
}

/** Address of the shared upload page of the photo stand, the QR code of the stand card. */
export function photoStandUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/stand/${encodeURIComponent(token)}`;
}
