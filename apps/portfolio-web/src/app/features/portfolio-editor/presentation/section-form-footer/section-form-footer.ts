import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { UiButton } from '@shared/ui/button/button';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { EDITOR_PATH } from '../section-form/section-save';

/** End of every section form: why saving failed, the save button and the way back. */
@Component({
  selector: 'app-section-form-footer',
  imports: [RouterLink, TranslatePipe, FailureAlert, UiButton],
  styleUrl: './section-form-footer.scss',
  templateUrl: './section-form-footer.html',
})
export class SectionFormFooter {
  private readonly _store = inject(PortfolioEditorStore);

  private readonly _editorPath = EDITOR_PATH;
  private readonly _saving = computed(() => this._store.mutationState().loadingState === 'loading');
}
