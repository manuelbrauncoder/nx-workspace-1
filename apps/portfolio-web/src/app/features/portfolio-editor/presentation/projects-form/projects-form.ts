import { Component, computed, ElementRef, inject, linkedSignal, viewChild } from '@angular/core';
import { applyEach, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { PORTFOLIO_LIMITS, Project, ProjectsSection } from '../../domain/portfolio';
import { fromImageForm, ImageForm, imageRules, toImageForm } from '../image-field/image-form';
import { ImagesField } from '../images-field/images-field';
import { ListItemActions } from '../list-item-actions/list-item-actions';
import { LocalizedField } from '../localized-field/localized-field';
import { SectionFormFooter } from '../section-form-footer/section-form-footer';
import {
  fromLines,
  linesRules,
  localizedRules,
  textRules,
  toLines,
  urlRules,
} from '../section-form/section-rules';
import { injectSectionSave, moveItem } from '../section-form/section-save';

/**
 * The stack is a textarea with one technology per line, an unset link is empty. The description
 * is rich-text HTML, the images are in the order they are shown.
 */
interface ProjectFormModel {
  title: string;
  description: Localized<string>;
  stack: string;
  githubUrl: string;
  testUrl: string;
  images: ImageForm[];
}

interface ProjectsFormModel {
  headline: Localized<string>;
  description: Localized<string>;
  items: ProjectFormModel[];
}

const toProjectModel = (project: Project | undefined): ProjectFormModel => ({
  title: project?.title ?? '',
  description: project ? { ...project.description } : localizedOf(''),
  stack: fromLines(project?.stack),
  githubUrl: project?.githubUrl ?? '',
  testUrl: project?.testUrl ?? '',
  // A new project starts with one empty image, it needs at least one.
  images: project ? project.images.map(toImageForm) : [toImageForm(undefined)],
});

const toModel = (projects: ProjectsSection | undefined): ProjectsFormModel => ({
  headline: projects ? { ...projects.headline } : localizedOf(''),
  description: projects ? { ...projects.description } : localizedOf(''),
  items: (projects?.items ?? []).map(toProjectModel),
});

/** Only called for a valid form, in which every image has a file. */
const fromModel = (model: ProjectsFormModel): ProjectsSection => ({
  headline: model.headline,
  description: model.description,
  items: model.items.map((item) => ({
    title: item.title,
    description: item.description,
    stack: toLines(item.stack),
    githubUrl: item.githubUrl,
    testUrl: item.testUrl,
    images: item.images.flatMap((image) => fromImageForm(image) ?? []),
  })),
});

/** The projects section: heading, introduction and the projects in the order they are shown. */
@Component({
  selector: 'app-projects-form',
  imports: [
    FormField,
    FormRoot,
    TranslatePipe,
    FormText,
    FormTextarea,
    UiButton,
    UiIcon,
    UiText,
    ImagesField,
    ListItemActions,
    LocalizedField,
    SectionFormFooter,
  ],
  styleUrl: './projects-form.scss',
  templateUrl: './projects-form.html',
})
export class ProjectsForm {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _save = injectSectionSave('projects');

  private readonly _maxProjects = PORTFOLIO_LIMITS.projects;
  private readonly _maxImages = PORTFOLIO_LIMITS.projectImages;
  // The button carries `UiButton`, so the element has to be asked for.
  private readonly _addButton = viewChild.required('addButton', {
    read: ElementRef<HTMLButtonElement>,
  });

  private readonly _section = computed(() => this._store.portfolio()?.projects);
  /** Starts from the stored section and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._section()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _projectsForm = form(
    this._model,
    (path) => {
      localizedRules(path.headline, this._i18n, { max: PORTFOLIO_LIMITS.headline });
      localizedRules(path.description, this._i18n, { max: PORTFOLIO_LIMITS.description });
      applyEach(path.items, (item) => {
        textRules(item.title, this._i18n, { max: PORTFOLIO_LIMITS.projectTitle });
        localizedRules(item.description, this._i18n, { max: PORTFOLIO_LIMITS.projectDescription });
        linesRules(item.stack, this._i18n, {
          max: PORTFOLIO_LIMITS.stack,
          maxLength: PORTFOLIO_LIMITS.stackItem,
          optional: true,
        });
        urlRules(item.testUrl, this._i18n, { max: PORTFOLIO_LIMITS.url, optional: true });
        urlRules(item.githubUrl, this._i18n, { max: PORTFOLIO_LIMITS.url, optional: true });
        validate(item.images, ({ value }) =>
          value().length === 0
            ? {
                kind: 'required',
                message: this._i18n.translate('sectionEditor.validation.imagesRequired'),
              }
            : undefined,
        );
        applyEach(item.images, (image) => imageRules(image, this._i18n));
      });
    },
    { submission: { action: () => this._save(fromModel(this._model())) } },
  );

  private _add(): void {
    this._model.update((model) => ({
      ...model,
      items: [...model.items, toProjectModel(undefined)],
    }));
  }

  private _move(index: number, offset: -1 | 1): void {
    this._model.update((model) => ({ ...model, items: moveItem(model.items, index, offset) }));
  }

  private async _remove(index: number): Promise<void> {
    const number = index + 1;
    const confirmed = await this._confirmDialog.confirm({
      heading: this._i18n.translate('sectionEditor.projects.removeHeading', { number }),
      description: this._i18n.translate('sectionEditor.list.removeDescription'),
      confirmLabel: this._i18n.translate('sectionEditor.list.removeConfirm'),
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    this._model.update((model) => ({
      ...model,
      items: model.items.filter((_item, position) => position !== index),
    }));
    // The removed project took the focus with it.
    this._addButton().nativeElement.focus();
  }
}
