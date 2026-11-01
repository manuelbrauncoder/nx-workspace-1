import { Component, input } from '@angular/core';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { UiText } from '@shared/ui/text/text';
import { SkillsSection as Skills } from '../../domain/portfolio';
import { SkillSignpost } from '../skill-signpost/skill-signpost';

/** The skill set as signposts, two by two on a wide screen. */
@Component({
  selector: 'app-skills-section',
  imports: [LocalizedPipe, UiText, SkillSignpost],
  styleUrl: './skills-section.scss',
  templateUrl: './skills-section.html',
})
export class SkillsSection {
  readonly skills = input.required<Skills>();
}
