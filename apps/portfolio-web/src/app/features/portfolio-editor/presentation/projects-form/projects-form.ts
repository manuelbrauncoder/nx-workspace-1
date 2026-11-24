import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { applyEach, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { FormSelect } from '@shared/form-controls/form-select/form-select';
import { FormSwitch } from '@shared/form-controls/form-switch/form-switch';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiBadge } from '@shared/ui/badge/badge';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import {
  PORTFOLIO_LIMITS,
  Project,
  PROJECT_TAG_COLORS,
  ProjectsSection,
  ProjectTag,
  ProjectTagColor,
} from '../../domain/portfolio';
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
 * is rich-text HTML, the images are in the order they are shown. An unpublished project is a draft
 * that only the admin sees on the site. Tags are short labels next to the title, e.g. "Work project".
 */
interface ProjectFormModel {
  title: string;
  description: Localized<string>;
  stack: string;
  githubUrl: string;
  testUrl: string;
  images: ImageForm[];
  published: boolean;
  tags: ProjectTag[];
}

/** The name of every tag colour in the colour select. */
const TAG_COLOR_KEYS: Record<ProjectTagColor, TranslationKey> = {
  neutral: 'sectionEditor.projects.tagColors.neutral',
  amber: 'sectionEditor.projects.tagColors.amber',
  blue: 'sectionEditor.projects.tagColors.blue',
  green: 'sectionEditor.projects.tagColors.green',
  rose: 'sectionEditor.projects.tagColors.rose',
  violet: 'sectionEditor.projects.tagColors.violet',
};

const newTag = (): ProjectTag => ({ label: localizedOf(''), color: 'neutral' });

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
  // A new project is a draft, so it can be checked on the site before everyone sees it.
  published: project?.published ?? false,
  tags: (project?.tags ?? []).map((tag) => ({ label: { ...tag.label }, color: tag.color })),
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
    published: item.published,
    tags: item.tags,
  })),
});

/** The projects section: heading, introduction and the projects in the order they are shown. */
@Component({
  selector: 'app-projects-form',
  imports: [
    FormField,
    FormRoot,
    LocalizedPipe,
    TranslatePipe,
    FormSelect,
    FormSwitch,
    FormText,
    FormTextarea,
    UiBadge,
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
  private readonly _injector = inject(Injector);
  private readonly _i18n = inject(I18nService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _save = injectSectionSave('projects');

  private readonly _maxProjects = PORTFOLIO_LIMITS.projects;
  private readonly _maxImages = PORTFOLIO_LIMITS.projectImages;
  private readonly _maxTags = PORTFOLIO_LIMITS.projectTags;
  private readonly _tagColors = computed(() =>
    PROJECT_TAG_COLORS.map((color) => ({
      value: color,
      label: this._i18n.translate(TAG_COLOR_KEYS[color]),
    })),
  );
  // The button carries `UiButton`, so the element has to be asked for.
  private readonly _addButton = viewChild.required('addButton', {
    read: ElementRef<HTMLButtonElement>,
  });
  /** The "add tag" button of every project, in project order. */
  private readonly _addTagButtons = viewChildren('addTag', { read: ElementRef<HTMLButtonElement> });

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
        applyEach(item.tags, (tag) => {
          localizedRules(tag.label, this._i18n, { max: PORTFOLIO_LIMITS.projectTag });
        });
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

  private _addTag(projectIndex: number): void {
    this._updateTags(projectIndex, (tags) => [...tags, newTag()]);
  }

  private _moveTag(projectIndex: number, index: number, offset: -1 | 1): void {
    this._updateTags(projectIndex, (tags) => moveItem(tags, index, offset));
  }

  /** A tag is quickly typed again, so it goes without asking. */
  private _removeTag(projectIndex: number, index: number): void {
    this._updateTags(projectIndex, (tags) => tags.filter((_tag, position) => position !== index));
    // The removed tag took the focus with it. After the render, because at the limit the add
    // button is still disabled until then.
    afterNextRender(() => this._addTagButtons()[projectIndex]?.nativeElement.focus(), {
      injector: this._injector,
    });
  }

  private _updateTags(projectIndex: number, change: (tags: ProjectTag[]) => ProjectTag[]): void {
    this._model.update((model) => ({
      ...model,
      items: model.items.map((item, position) =>
        position === projectIndex ? { ...item, tags: change(item.tags) } : item,
      ),
    }));
  }
}
