import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { Media, PortfolioSectionName, PortfolioSections } from '../domain/portfolio';
import { PortfolioEditorUseCase } from '../domain/portfolio-editor.usecase';

/**
 * State of the editor. Provided in the feature routes, so it lives as long as the feature.
 * Holds the content in every language, as the forms edit both at once.
 */
@Service({ autoProvided: false })
export class PortfolioEditorStore {
  private readonly _useCase = inject(PortfolioEditorUseCase);

  private readonly _content = rxResource({ stream: () => this._useCase.get() });

  /** The library is only loaded once someone opens it. */
  private readonly _mediaRequested = signal(false);
  private readonly _media = rxResource({
    params: () => this._mediaRequested() || undefined,
    stream: () => this._useCase.getMedia(),
    defaultValue: [] as Media[],
  });

  private readonly _mutation = mutation();
  // Uploads run while a form is open, so a failed upload must not look like a failed save.
  private readonly _uploadMutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly portfolio = computed(() =>
    this._content.hasValue() ? this._content.value() : undefined,
  );
  readonly state = asyncState(this._content);

  readonly media = computed(() => (this._media.hasValue() ? this._media.value() : []));
  readonly mediaState = asyncState(this._media);

  /** State of the most recent save. */
  readonly mutationState = this._mutation.state;
  /** State of the most recent upload. */
  readonly uploadState = this._uploadMutation.state;

  reload(): void {
    this._content.reload();
  }

  /** Creates the section if it does not exist yet, otherwise replaces it. */
  async save<K extends PortfolioSectionName>(
    name: K,
    value: PortfolioSections[K],
  ): Promise<boolean> {
    const exists = this.portfolio()?.[name] !== undefined;
    const saved = await this._mutation.run(
      exists ? this._useCase.updateSection(name, value) : this._useCase.createSection(name, value),
    );
    if (saved) {
      patchResource(this._content, (portfolio) => portfolio && { ...portfolio, [name]: saved });
    }
    return saved !== undefined;
  }

  /** Drops the failure of an earlier save, e.g. when another section is opened. */
  resetMutation(): void {
    this._mutation.reset();
    this._uploadMutation.reset();
  }

  /** Loads the library, or loads it again when it is opened once more. */
  loadMedia(): void {
    if (this._mediaRequested()) {
      this._media.reload();
    } else {
      this._mediaRequested.set(true);
    }
  }

  async upload(file: File): Promise<Media | undefined> {
    const media = await this._uploadMutation.run(this._useCase.upload(file));
    if (media && this._mediaRequested()) {
      patchResource(this._media, (existing) => [media, ...existing]);
    }
    return media;
  }
}
