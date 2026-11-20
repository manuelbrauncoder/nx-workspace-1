import { Component, input } from '@angular/core';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { UiText } from '@shared/ui/text/text';
import { SkillsSection as Skills } from '../../domain/portfolio';
import { Reveal } from '../reveal/reveal';

/** The skill set as glass cards, one per area: one column, two from `md`, four on a wide screen. */
@Component({
  selector: 'app-skills-section',
  imports: [LocalizedPipe, UiText, Reveal],
  styleUrl: './skills-section.scss',
  templateUrl: './skills-section.html',
})
export class SkillsSection {
  readonly skills = input.required<Skills>();
}
