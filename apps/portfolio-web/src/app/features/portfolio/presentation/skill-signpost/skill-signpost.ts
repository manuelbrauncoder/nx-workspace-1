import { Component, input } from '@angular/core';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { SkillSet } from '../../domain/portfolio';

/** One set of skills as a trail signpost: an arrow sign on a post, the skills hang off it. */
@Component({
  selector: 'app-skill-signpost',
  imports: [LocalizedPipe],
  styleUrl: './skill-signpost.scss',
  templateUrl: './skill-signpost.html',
})
export class SkillSignpost {
  readonly set = input.required<SkillSet>();
}
