import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiText } from '@shared/ui/text/text';
import { LegalPage } from '../legal-page/legal-page';
import { OwnerContact } from '../owner-contact/owner-contact';

@Component({
  selector: 'app-legal-imprint',
  imports: [TranslatePipe, UiText, LegalPage, OwnerContact],
  styleUrl: './imprint.scss',
  templateUrl: './imprint.html',
})
export class Imprint {}
