import { Component, input } from '@angular/core';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { UiText } from '@shared/ui/text/text';
import { ProjectsSection as Projects } from '../../domain/portfolio';
import { ProjectCard } from '../project-card/project-card';

/** The projects, alternating left and right on a wide screen. */
@Component({
  selector: 'app-projects-section',
  imports: [LocalizedPipe, UiText, ProjectCard],
  styleUrl: './projects-section.scss',
  templateUrl: './projects-section.html',
})
export class ProjectsSection {
  readonly projects = input.required<Projects>();
}
