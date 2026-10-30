import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiText } from '@shared/ui/text/text';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { PortfolioSectionName } from '../../domain/portfolio';
import { AboutForm } from '../about-form/about-form';
import { ContactForm } from '../contact-form/contact-form';
import { HeroForm } from '../hero-form/hero-form';
import { ProjectsForm } from '../projects-form/projects-form';
import { EDITOR_PATH } from '../section-form/section-save';
import { SeoForm } from '../seo-form/seo-form';
import { SettingsForm } from '../settings-form/settings-form';
import { SkillsForm } from '../skills-form/skills-form';

/**
 * Edits one section on `/admin/portfolio/:section`. Saving creates the section if it does not
 * exist yet. The route only matches known sections.
 */
@Component({
  selector: 'app-section-editor',
  imports: [
    TranslatePipe,
    AsyncContent,
    UiBreadcrumb,
    UiText,
    AboutForm,
    ContactForm,
    HeroForm,
    ProjectsForm,
    SeoForm,
    SettingsForm,
    SkillsForm,
  ],
  styleUrl: './section-editor.scss',
  templateUrl: './section-editor.html',
})
export class SectionEditor {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly section = input.required<PortfolioSectionName>();

  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);

  private readonly _sectionKey = computed(
    () => `portfolioEditor.sections.${this.section()}` as const,
  );
  private readonly _breadcrumb = computed((): UiBreadcrumbItem[] => [
    { labelKey: 'admin.areas.hub', path: '/admin' },
    { labelKey: 'admin.areas.portfolio', path: EDITOR_PATH },
    { labelKey: this._sectionKey() },
  ]);
  private readonly _exists = computed(
    () => this._store.portfolio()?.[this.section()] !== undefined,
  );

  constructor() {
    // A failure from another section does not belong here.
    effect(() => {
      this.section();
      untracked(() => this._store.resetMutation());
    });
    injectPageSeo(() => ({ title: this._i18n.translate(this._sectionKey()) }));
  }
}
