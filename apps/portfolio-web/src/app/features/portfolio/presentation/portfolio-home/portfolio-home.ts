import { Component, inject } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { PortfolioStore } from '../../application/portfolio.store';
import { AboutSection } from '../about-section/about-section';
import { ContactSection } from '../contact-section/contact-section';
import { HeroSection } from '../hero-section/hero-section';
import { ProjectsSection } from '../projects-section/projects-section';
import { SkillsSection } from '../skills-section/skills-section';

/**
 * The start page: hero, about me, projects, skill set and contact, as written in the editor.
 * A section that has not been created yet is left out. The sections alternate between the page
 * background and the surface color.
 */
@Component({
  selector: 'app-portfolio-home',
  imports: [
    TranslatePipe,
    AsyncContent,
    AboutSection,
    ContactSection,
    HeroSection,
    ProjectsSection,
    SkillsSection,
  ],
  styleUrl: './portfolio-home.scss',
  templateUrl: './portfolio-home.html',
})
export class PortfolioHome {
  private readonly _store = inject(PortfolioStore);
  private readonly _i18n = inject(I18nService);

  constructor() {
    injectPageSeo(() => {
      const seo = this._store.seo();
      if (!seo) {
        return undefined;
      }
      const image = seo.ogImage;
      return {
        title: this._i18n.localize(seo.title),
        description: this._i18n.localize(seo.description),
        image: image && {
          url: image.url,
          width: image.width,
          height: image.height,
          alt: this._i18n.localize(image.alt),
        },
      };
    });
  }
}
