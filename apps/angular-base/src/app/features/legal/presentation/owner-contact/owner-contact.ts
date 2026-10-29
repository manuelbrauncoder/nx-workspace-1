import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { SITE_OWNER } from '@core/site-owner';

/** Contact details of the site owner. Address and phone only show once they are set. */
@Component({
  selector: 'app-legal-owner-contact',
  imports: [TranslatePipe],
  styleUrl: './owner-contact.scss',
  templateUrl: './owner-contact.html',
})
export class OwnerContact {
  private readonly _owner = SITE_OWNER;
  private readonly _mailHref = `mailto:${SITE_OWNER.email}`;
  private readonly _phoneHref = `tel:${SITE_OWNER.phone?.replace(/\s/g, '')}`;
}
