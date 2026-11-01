import { Component, computed, inject, input, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedPipe } from '@core/i18n/localized.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormCheckbox } from '@shared/form-controls/form-checkbox/form-checkbox';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { FormTextarea } from '@shared/form-controls/form-textarea/form-textarea';
import { UiButton } from '@shared/ui/button/button';
import { UiIcon } from '@shared/ui/icon/icon';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { ContactStore } from '../../application/contact.store';
import { ContactMessage } from '../../domain/contact-message';
import { ContactSection as Contact, Settings } from '../../domain/portfolio';
import { TopoMap } from '../topo-map/topo-map';

interface ContactForm extends ContactMessage {
  /** Consent to the processing of the data, see the privacy policy. Not sent to the backend. */
  privacy: boolean;
}

const EMPTY: ContactForm = { name: '', email: '', message: '', privacy: false };

/** Contact: the direct ways to reach me and a form that sends a message through the backend. */
@Component({
  selector: 'app-contact-section',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    LocalizedPipe,
    TranslatePipe,
    FailureAlert,
    FormCheckbox,
    FormText,
    FormTextarea,
    UiButton,
    UiIcon,
    UiText,
    TopoMap,
  ],
  styleUrl: './contact-section.scss',
  templateUrl: './contact-section.html',
})
export class ContactSection {
  readonly contact = input.required<Contact>();
  /** Email and profiles for the direct ways. Without settings only the form is left. */
  readonly settings = input<Settings>();

  private readonly _store = inject(ContactStore);
  private readonly _toast = inject(UiToastService);
  private readonly _i18n = inject(I18nService);

  private readonly _sending = computed(
    () => this._store.mutationState().loadingState === 'loading',
  );

  private readonly _message = signal<ContactForm>({ ...EMPTY });

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _contactForm = form(
    this._message,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      required(path.name, {
        message: () => this._i18n.translate('portfolioHome.contact.validation.nameRequired'),
      });
      required(path.email, {
        message: () => this._i18n.translate('portfolioHome.contact.validation.emailRequired'),
      });
      email(path.email, {
        message: () => this._i18n.translate('portfolioHome.contact.validation.emailInvalid'),
      });
      required(path.message, {
        message: () => this._i18n.translate('portfolioHome.contact.validation.messageRequired'),
      });
      validate(path.privacy, ({ value }) =>
        value()
          ? undefined
          : {
              kind: 'privacy',
              message: this._i18n.translate('portfolioHome.contact.validation.privacyRequired'),
            },
      );
    },
    { submission: { action: () => this._send() } },
  );

  private async _send(): Promise<void> {
    const { name, email, message } = this._message();
    if (await this._store.send({ name, email, message })) {
      this._toast.success(this._i18n.translate('portfolioHome.contact.sent'));
      // Empty fields again, without errors for fields nobody has touched since.
      this._message.set({ ...EMPTY });
      this._contactForm().reset();
    }
  }
}
