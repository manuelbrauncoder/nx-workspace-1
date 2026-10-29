/** Who runs the site. The legal pages take their contact details from here. */
export interface SiteOwner {
  name: string;
  email: string;
  /** Lines of the postal address. Required by law in the imprint of a business site. */
  address?: string[];
  phone?: string;
}

export const SITE_OWNER: SiteOwner = {
  name: 'Manuel Braun',
  email: 'mail@manuel-braun.net',
};
