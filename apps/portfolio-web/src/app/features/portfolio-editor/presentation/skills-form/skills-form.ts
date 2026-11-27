import { Component, computed, ElementRef, inject, linkedSignal, viewChild } from '@angular/core';
import { applyEach, form, FormRoot } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { UiButton } from '@shared/ui/button/button';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { PORTFOLIO_LIMITS, Skill, SkillSet, SkillsSection } from '../../domain/portfolio';
import { ListItemActions } from '../list-item-actions/list-item-actions';
import { LocalizedField } from '../localized-field/localized-field';
import { SectionFormFooter } from '../section-form-footer/section-form-footer';
import {
  fromLines,
  localizedLinesRules,
  localizedRules,
  toLines,
} from '../section-form/section-rules';
import { injectSectionSave, moveItem } from '../section-form/section-save';

/** The points are a textarea per language with one point per line. */
interface SkillFormModel {
  name: Localized<string>;
  points: Localized<string>;
}

interface SkillSetFormModel {
  title: Localized<string>;
  skills: SkillFormModel[];
}

interface SkillsFormModel {
  headline: Localized<string>;
  description: Localized<string>;
  sets: SkillSetFormModel[];
}

const toSkillModel = (skill: Skill | undefined): SkillFormModel => ({
  name: skill ? { ...skill.name } : localizedOf(''),
  points: { de: fromLines(skill?.points.de), en: fromLines(skill?.points.en) },
});

const toSetModel = (set: SkillSet | undefined): SkillSetFormModel => ({
  title: set ? { ...set.title } : localizedOf(''),
  skills: (set?.skills ?? []).map(toSkillModel),
});

const toModel = (skills: SkillsSection | undefined): SkillsFormModel => ({
  headline: skills ? { ...skills.headline } : localizedOf(''),
  description: skills ? { ...skills.description } : localizedOf(''),
  sets: (skills?.sets ?? []).map(toSetModel),
});

const fromModel = (model: SkillsFormModel): SkillsSection => ({
  headline: model.headline,
  description: model.description,
  sets: model.sets.map((set) => ({
    title: set.title,
    skills: set.skills.map((skill) => ({
      name: skill.name,
      points: { de: toLines(skill.points.de), en: toLines(skill.points.en) },
    })),
  })),
});

/** The skill set: heading, introduction and the areas with their skills. */
@Component({
  selector: 'app-skills-form',
  imports: [
    FormRoot,
    TranslatePipe,
    UiButton,
    UiIcon,
    UiText,
    ListItemActions,
    LocalizedField,
    SectionFormFooter,
  ],
  styleUrl: './skills-form.scss',
  templateUrl: './skills-form.html',
})
export class SkillsForm {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _confirmDialog = inject(UiConfirmDialogService);
  private readonly _save = injectSectionSave('skills');

  private readonly _maxSets = PORTFOLIO_LIMITS.skillSets;
  private readonly _maxSkills = PORTFOLIO_LIMITS.skills;
  // The button carries `UiButton`, so the element has to be asked for.
  private readonly _addSetButton = viewChild.required('addSet', {
    read: ElementRef<HTMLButtonElement>,
  });

  private readonly _section = computed(() => this._store.portfolio()?.skills);
  /** Starts from the stored section and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._section()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _skillsForm = form(
    this._model,
    (path) => {
      localizedRules(path.headline, this._i18n, { max: PORTFOLIO_LIMITS.headline });
      localizedRules(path.description, this._i18n, { max: PORTFOLIO_LIMITS.description });
      applyEach(path.sets, (set) => {
        localizedRules(set.title, this._i18n, { max: PORTFOLIO_LIMITS.skillSetTitle });
        applyEach(set.skills, (skill) => {
          localizedRules(skill.name, this._i18n, { max: PORTFOLIO_LIMITS.skillName });
          localizedLinesRules(skill.points, this._i18n, {
            max: PORTFOLIO_LIMITS.points,
            maxLength: PORTFOLIO_LIMITS.point,
            optional: true,
          });
        });
      });
    },
    { submission: { action: () => this._save(fromModel(this._model())) } },
  );

  private _addSet(): void {
    this._updateSets((sets) => [...sets, toSetModel(undefined)]);
  }

  private _moveSet(index: number, offset: -1 | 1): void {
    this._updateSets((sets) => moveItem(sets, index, offset));
  }

  private async _removeSet(index: number): Promise<void> {
    if (await this._confirmRemove('sectionEditor.skills.removeSetHeading', index)) {
      this._updateSets((sets) => sets.filter((_set, position) => position !== index));
      // The removed area took the focus with it.
      this._addSetButton().nativeElement.focus();
    }
  }

  private _addSkill(setIndex: number): void {
    this._updateSkills(setIndex, (skills) => [...skills, toSkillModel(undefined)]);
  }

  private _moveSkill(setIndex: number, index: number, offset: -1 | 1): void {
    this._updateSkills(setIndex, (skills) => moveItem(skills, index, offset));
  }

  private async _removeSkill(setIndex: number, index: number): Promise<void> {
    if (await this._confirmRemove('sectionEditor.skills.removeSkillHeading', index)) {
      this._updateSkills(setIndex, (skills) =>
        skills.filter((_skill, position) => position !== index),
      );
    }
  }

  private _confirmRemove(
    heading: 'sectionEditor.skills.removeSetHeading' | 'sectionEditor.skills.removeSkillHeading',
    index: number,
  ): Promise<boolean> {
    return this._confirmDialog.confirm({
      heading: this._i18n.translate(heading, { number: index + 1 }),
      description: this._i18n.translate('sectionEditor.list.removeDescription'),
      confirmLabel: this._i18n.translate('sectionEditor.list.removeConfirm'),
      variant: 'destructive',
    });
  }

  private _updateSets(change: (sets: SkillSetFormModel[]) => SkillSetFormModel[]): void {
    this._model.update((model) => ({ ...model, sets: change(model.sets) }));
  }

  private _updateSkills(
    setIndex: number,
    change: (skills: SkillFormModel[]) => SkillFormModel[],
  ): void {
    this._updateSets((sets) =>
      sets.map((set, position) =>
        position === setIndex ? { ...set, skills: change(set.skills) } : set,
      ),
    );
  }
}
