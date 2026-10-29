import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiText } from '@shared/ui/text/text';
import { SITE_OWNER } from '../../../../site-owner';
import { LegalPage } from '../legal-page/legal-page';

@Component({
  selector: 'app-legal-accessibility',
  imports: [TranslatePipe, UiText, LegalPage],
  styleUrl: './accessibility.scss',
  templateUrl: './accessibility.html',
})
export class Accessibility {
  private readonly _email = SITE_OWNER.email;
  private readonly _mailHref = `mailto:${SITE_OWNER.email}`;
}
