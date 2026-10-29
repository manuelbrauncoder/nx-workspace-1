import { DOCUMENT, effect, inject, Service, signal, untracked } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { APP_NAME } from '@core/app-name';
import { AppConfigService } from '@core/config/app-config';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslationKey } from '@core/i18n/translation-key';
import { RouteSeo } from './route-seo';

/** Preview image for shared links, used unless a route or page names another one. */
const DEFAULT_IMAGE = { path: '/og-image.png', width: 1200, height: 630 };

/** What the router knows about the active page. */
export interface ActiveRouteSeo {
  /** The `title` of the route, a translation key. */
  titleKey: string | undefined;
  /** Path of the page without query and fragment, e.g. `/notes/42`. */
  path: string;
  seo: RouteSeo;
}

/** Meta data a page takes from its loaded data. Texts are final, not translation keys. */
export interface PageSeo {
  title?: string;
  description?: string;
  /** Path of the preview image for shared links. */
  image?: string;
}

/**
 * Writes title, description, robots, canonical and social tags of the active page into the
 * document head, on the server and in the browser. Routes feed it through `routeSeo()`, pages
 * with loaded data through `injectPageSeo()`. Nothing else touches these tags.
 */
@Service()
export class SeoService {
  private readonly _title = inject(Title);
  private readonly _meta = inject(Meta);
  private readonly _document = inject(DOCUMENT);
  private readonly _i18n = inject(I18nService);
  private readonly _config = inject(AppConfigService);

  private readonly _route = signal<ActiveRouteSeo | undefined>(undefined);
  private readonly _page = signal<PageSeo | undefined>(undefined);

  constructor() {
    // Keeps the tags in the active language.
    effect(() => this._render());
  }

  /** Called by `SeoTitleStrategy` after every navigation. */
  setRoute(route: ActiveRouteSeo): void {
    this._route.set(route);
    this._renderNow();
  }

  /** Called by `injectPageSeo()`. `undefined` falls back to what the route says. */
  setPage(page: PageSeo | undefined): void {
    this._page.set(page);
    this._renderNow();
  }

  /** Not left to the effect alone, so the tags are set before the server serializes the page. */
  private _renderNow(): void {
    untracked(() => this._render());
  }

  private _render(): void {
    const route = this._route();
    const page = this._page();
    // Before the first navigation there is no page to describe.
    if (!route) {
      return;
    }

    const pageTitle =
      page?.title ??
      // A route title is a plain string, the keys are checked where the scope is defined.
      (route.titleKey ? this._i18n.translate(route.titleKey as TranslationKey) : undefined);
    const title = pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME;
    const description =
      page?.description || this._i18n.translate(route.seo.description ?? 'seo.defaultDescription');
    const url = this._config.siteUrl + route.path;
    const imagePath = page?.image ?? route.seo.image ?? DEFAULT_IMAGE.path;
    const indexable = this._config.allowIndexing && route.seo.index !== false;

    this._title.setTitle(title);
    this._setCanonical(url);
    this._setName('description', description);
    this._setName('robots', indexable ? 'index, follow' : 'noindex, nofollow');
    this._setName('twitter:card', 'summary_large_image');
    this._setProperty('og:type', 'website');
    this._setProperty('og:site_name', APP_NAME);
    this._setProperty('og:locale', this._i18n.locale().replace('-', '_'));
    this._setProperty('og:title', title);
    this._setProperty('og:description', description);
    this._setProperty('og:url', url);
    const image = this._config.siteUrl + imagePath;
    this._setProperty('og:image', image);
    // Not every preview falls back to `og:image`.
    this._setName('twitter:image', image);
    this._setProperty('og:image:alt', this._i18n.translate('seo.imageAlt'));
    // The size is only known for the default image.
    const isDefaultImage = imagePath === DEFAULT_IMAGE.path;
    this._setProperty('og:image:width', isDefaultImage ? `${DEFAULT_IMAGE.width}` : undefined);
    this._setProperty('og:image:height', isDefaultImage ? `${DEFAULT_IMAGE.height}` : undefined);
  }

  private _setName(name: string, content: string): void {
    this._meta.updateTag({ name, content });
  }

  private _setProperty(property: string, content: string | undefined): void {
    if (content === undefined) {
      this._meta.removeTag(`property="${property}"`);
    } else {
      this._meta.updateTag({ property, content });
    }
  }

  private _setCanonical(url: string): void {
    let link = this._document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this._document.createElement('link');
      link.rel = 'canonical';
      this._document.head.appendChild(link);
    }
    link.href = url;
  }
}
