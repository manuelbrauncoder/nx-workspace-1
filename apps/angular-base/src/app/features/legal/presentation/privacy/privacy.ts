import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { UiText } from '@shared/ui/text/text';
import { LegalPage } from '../legal-page/legal-page';
import { OwnerContact } from '../owner-contact/owner-contact';

interface PrivacySection {
  headingKey: TranslationKey;
  textKey: TranslationKey;
}

@Component({
  selector: 'app-legal-privacy',
  imports: [TranslatePipe, UiText, LegalPage, OwnerContact],
  styleUrl: './privacy.scss',
  templateUrl: './privacy.html',
})
export class Privacy {
  /** The sections after the controller, in the order they are shown. */
  private readonly _sections: PrivacySection[] = [
    { headingKey: 'legalPrivacy.hosting.heading', textKey: 'legalPrivacy.hosting.text' },
    { headingKey: 'legalPrivacy.storage.heading', textKey: 'legalPrivacy.storage.text' },
    { headingKey: 'legalPrivacy.thirdParties.heading', textKey: 'legalPrivacy.thirdParties.text' },
    { headingKey: 'legalPrivacy.tracking.heading', textKey: 'legalPrivacy.tracking.text' },
    { headingKey: 'legalPrivacy.mail.heading', textKey: 'legalPrivacy.mail.text' },
    { headingKey: 'legalPrivacy.rights.heading', textKey: 'legalPrivacy.rights.text' },
  ];
}
