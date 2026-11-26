import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';

interface HomeStep {
  readonly heading: TranslationKey;
  readonly text: TranslationKey;
}

/**
 * The start page for visitors: what vyte is, shown as the invitation a guest gets, the three
 * steps from the announcement to the photos, and the way to the sign-in. A signed-in user never
 * sees it, `visitorsOnlyGuard` sends them to their events.
 */
@Component({
  selector: 'app-home',
  imports: [NgOptimizedImage, RouterLink, TranslatePipe, UiButton, UiText],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly _steps: readonly HomeStep[] = [
    { heading: 'home.steps.saveTheDate.heading', text: 'home.steps.saveTheDate.text' },
    { heading: 'home.steps.invitation.heading', text: 'home.steps.invitation.text' },
    { heading: 'home.steps.photos.heading', text: 'home.steps.photos.text' },
  ];
}
