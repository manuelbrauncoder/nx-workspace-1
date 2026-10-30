import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiCardImports } from '@shared/ui/card/card';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { SHOWCASE_PAGES } from '../showcase-pages';

@Component({
  selector: 'app-showcase-hub',
  imports: [RouterLink, TranslatePipe, UiCardImports, UiIcon, UiText],
  styleUrl: './hub.scss',
  templateUrl: './hub.html',
})
export class Hub {
  private readonly _pages = SHOWCASE_PAGES;
}
