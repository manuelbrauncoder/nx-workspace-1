import { JsonPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  disabled,
  email,
  form,
  FormField,
  max,
  min,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FormCheckbox } from '@shared/form-controls/form-checkbox/form-checkbox';
import { FormDate } from '@shared/form-controls/form-date/form-date';
import { FormFiles } from '@shared/form-controls/form-files/form-files';
import {
  FormRadioGroup,
  FormRadioOption,
} from '@shared/form-controls/form-radio-group/form-radio-group';
import { FormRichText } from '@shared/form-controls/form-rich-text/form-rich-text';
import { FormSelect, FormSelectOption } from '@shared/form-controls/form-select/form-select';
import { FormStepper } from '@shared/form-controls/form-stepper/form-stepper';
import { FormSwitch } from '@shared/form-controls/form-switch/form-switch';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { FormToggleGroup } from '@shared/form-controls/form-toggle-group/form-toggle-group';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';
import { ShowcaseSection } from '../showcase-section/showcase-section';

type Role = 'developer' | 'designer' | 'product';
type ContactWay = 'mail' | 'phone';
type Availability = 'fullTime' | 'partTime';

interface Profile {
  name: string;
  email: string;
  about: string;
  notes: string;
  attachments: File[];
  birthday: Date | null;
  role: Role | null;
  contactWay: ContactWay;
  availability: Availability | null;
  teamSize: number;
  newsletter: boolean;
  terms: boolean;
  customerNumber: string;
}

@Component({
  selector: 'app-showcase-forms',
  imports: [
    JsonPipe,
    FormField,
    TranslatePipe,
    FormCheckbox,
    FormDate,
    FormFiles,
    FormRadioGroup,
    FormRichText,
    FormSelect,
    FormStepper,
    FormSwitch,
    FormText,
    FormTextarea,
    FormToggleGroup,
    UiButton,
    UiText,
    ShowcaseSection,
  ],
  styleUrl: './forms.scss',
  templateUrl: './forms.html',
})
export class Forms {
  private readonly _i18n = inject(I18nService);

  /** Computed, so the labels follow the language. */
  private readonly _roles = computed<FormSelectOption<Role>[]>(() => [
    { value: 'developer', label: this._i18n.translate('showcaseForms.roles.developer') },
    { value: 'designer', label: this._i18n.translate('showcaseForms.roles.designer') },
    { value: 'product', label: this._i18n.translate('showcaseForms.roles.product') },
  ]);

  private readonly _contactWays = computed(() => [
    { value: 'mail' as const, label: this._i18n.translate('showcaseForms.contactWays.mail') },
    { value: 'phone' as const, label: this._i18n.translate('showcaseForms.contactWays.phone') },
  ]);

  private readonly _availabilities = computed<FormRadioOption<Availability>[]>(() => [
    {
      value: 'fullTime',
      label: this._i18n.translate('showcaseForms.availability.fullTime'),
      description: this._i18n.translate('showcaseForms.availability.fullTimeDescription'),
    },
    {
      value: 'partTime',
      label: this._i18n.translate('showcaseForms.availability.partTime'),
      description: this._i18n.translate('showcaseForms.availability.partTimeDescription'),
    },
  ]);

  private readonly _profile = signal<Profile>({
    name: '',
    email: '',
    about: '',
    notes: '',
    attachments: [],
    birthday: null,
    role: null,
    contactWay: 'mail',
    availability: null,
    teamSize: 1,
    newsletter: false,
    terms: false,
    customerNumber: 'K-2048',
  });

  private readonly _profileForm = form(this._profile, (path) => {
    required(path.name, {
      message: () => this._i18n.translate('showcaseForms.validation.name'),
    });
    email(path.email, {
      message: () => this._i18n.translate('showcaseForms.validation.email'),
    });
    required(path.birthday, {
      message: () => this._i18n.translate('showcaseForms.validation.birthday'),
    });
    required(path.role, {
      message: () => this._i18n.translate('showcaseForms.validation.role'),
    });
    validate(path.terms, ({ value }) =>
      value()
        ? undefined
        : { kind: 'terms', message: this._i18n.translate('showcaseForms.validation.terms') },
    );
    min(path.teamSize, 1);
    max(path.teamSize, 10);
    disabled(path.customerNumber);
  });

  private readonly _submitted = signal(false);

  private async _save(event: Event): Promise<void> {
    event.preventDefault();
    this._submitted.set(false);
    await submit(this._profileForm, async () => {
      this._submitted.set(true);
    });
  }
}
