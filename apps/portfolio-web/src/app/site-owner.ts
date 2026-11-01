/**
 * Who runs the site, as the logo shows it. Contact details live in the backend: in the legal
 * pages and in the `settings` section of the start page.
 */
export interface SiteOwner {
  name: string;
}

export const SITE_OWNER: SiteOwner = {
  name: 'Manuel Braun',
};
