import { computed, inject, Injector, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState, success } from '@core/state/async-state';
import { settled } from '@core/state/settled';
import { PortfolioUseCase } from '../domain/portfolio.usecase';

/**
 * The content of the start page. Provided in the feature routes, which outlive the page, so the
 * route loads it again on every visit through `load()` and edits from the editor show up.
 */
@Service({ autoProvided: false })
export class PortfolioStore {
  private readonly _useCase = inject(PortfolioUseCase);
  private readonly _injector = inject(Injector);

  /** Nothing is requested before the first visit. */
  private readonly _requested = signal(false);
  private readonly _content = rxResource({
    params: () => this._requested() || undefined,
    stream: () => this._useCase.get(),
  });
  private readonly _contentState = asyncState(this._content);

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  private readonly _portfolio = computed(() =>
    this._content.hasValue() ? this._content.value() : undefined,
  );

  readonly hero = computed(() => this._portfolio()?.hero);
  readonly about = computed(() => this._portfolio()?.about);
  readonly projects = computed(() => this._portfolio()?.projects);
  readonly skills = computed(() => this._portfolio()?.skills);
  readonly contact = computed(() => this._portfolio()?.contact);
  readonly settings = computed(() => this._portfolio()?.settings);
  readonly seo = computed(() => this._portfolio()?.seo);

  /** Loaded content stays on screen while it is fetched again in the background. */
  readonly state = computed(() => (this._content.hasValue() ? success() : this._contentState()));

  /**
   * Called by the route before the page opens. The first visit waits for the content, so the
   * sections exist when the router scrolls to a `#fragment`. Later visits show what is loaded
   * and refresh it in the background.
   */
  async load(): Promise<void> {
    if (this._content.hasValue()) {
      this._content.reload();
      return;
    }
    if (this._requested()) {
      // An earlier attempt failed.
      this._content.reload();
    } else {
      this._requested.set(true);
    }
    await settled(this._content, this._injector);
  }

  reload(): void {
    this._content.reload();
  }
}
