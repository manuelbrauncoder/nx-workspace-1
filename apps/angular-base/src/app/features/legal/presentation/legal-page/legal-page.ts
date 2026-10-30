import { Component, input } from '@angular/core';
import { UiText } from '@shared/ui/text/text';

/** Frame of a legal page: the heading and a column narrow enough to read long text. */
@Component({
  selector: 'app-legal-page',
  imports: [UiText],
  styleUrl: './legal-page.scss',
  templateUrl: './legal-page.html',
})
export class LegalPage {
  readonly heading = input.required<string>();
}
