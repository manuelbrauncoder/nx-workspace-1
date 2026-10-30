import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { SHOWCASE_PAGES } from '../showcase-pages';

@Component({
  selector: 'app-showcase-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  styleUrl: './showcase-shell.scss',
  templateUrl: './showcase-shell.html',
})
export class ShowcaseShell {
  private readonly _pages = SHOWCASE_PAGES;
}
