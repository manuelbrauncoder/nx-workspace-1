import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle } from '@core/state/async-state';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { ContactStore } from '../../application/contact.store';
import { portfolioHomeI18n } from '../portfolio-home/portfolio-home.i18n';
import { ContactSection } from './contact-section';

describe('ContactSection', () => {
  const send = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => vi.clearAllMocks());

  async function render(mutationState: AsyncState = idle()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ContactStore, useValue: { mutationState: signal(mutationState), send } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(portfolioHomeI18n);
    const fixture = TestBed.createComponent(ContactSection);
    fixture.componentRef.setInput('contact', {
      headline: { de: 'Lust auf einen Austausch?', en: 'Interested in a chat?' },
      description: { de: 'Schreib mir.', en: 'Write to me.' },
    });
    fixture.componentRef.setInput('settings', {
      name: 'Manuel Braun',
      email: 'mail@manuel-braun.net',
      profiles: {
        github: 'https://github.com/manuelbrauncoder',
        linkedin: 'https://www.linkedin.com/in/manuel-braun-developer/',
      },
    });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      element,
      name: element.querySelector<HTMLInputElement>('input[type="text"]')!,
      email: element.querySelector<HTMLInputElement>('input[type="email"]')!,
      message: element.querySelector<HTMLTextAreaElement>('textarea')!,
      privacy: element.querySelector<HTMLButtonElement>('[role="checkbox"]')!,
    };
  }

  function type(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('puts the link to the privacy policy into the sentence of the checkbox', async () => {
    const { element } = await render();

    const label = element.querySelector('app-form-checkbox label')!;
    expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Ich habe die Datenschutzerklärung (öffnet in neuem Tab) gelesen und bin mit der Verarbeitung meiner Daten einverstanden.',
    );
    const link = label.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/privacy');
    // In a new tab, so nothing typed into the form gets lost.
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('links to the direct ways of contact', async () => {
    const { element } = await render();

    const links = Array.from(element.querySelectorAll('.contact__channels a'), (link) =>
      link.getAttribute('href'),
    );

    expect(links).toEqual([
      'mailto:mail@manuel-braun.net',
      'https://github.com/manuelbrauncoder',
      'https://www.linkedin.com/in/manuel-braun-developer/',
    ]);
  });

  it('opens GitHub and LinkedIn in a new tab and says so, the mail link stays', async () => {
    const { element } = await render();

    const [mail, github, linkedin] = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.contact__channels a'),
    );

    expect(mail.getAttribute('target')).toBeNull();
    for (const link of [github, linkedin]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.querySelector('.sr-only')?.textContent?.trim()).toBe('(öffnet in neuem Tab)');
    }
  });

  it('sends nothing and names every missing field', async () => {
    const { element } = await render();

    await submit(element);

    expect(send).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte gib deinen Namen ein.');
    expect(element.textContent).toContain('Bitte schreib eine Nachricht.');
    expect(element.textContent).toContain('Bitte stimme der Verarbeitung deiner Daten zu.');
  });

  it('sends the message without the consent and thanks for it', async () => {
    send.mockResolvedValue(true);
    const { fixture, element, name, email, message, privacy } = await render();
    type(name, 'Ada');
    type(email, 'ada@example.com');
    type(message, 'Hallo!');
    privacy.click();

    await submit(element);
    // The form is emptied after the store answered, which renders once more.
    await fixture.whenStable();

    expect(send).toHaveBeenCalledWith({ name: 'Ada', email: 'ada@example.com', message: 'Hallo!' });
    expect(toast.success).toHaveBeenCalledWith(
      'Danke für deine Nachricht. Ich melde mich so bald wie möglich.',
    );
    // The emptied fields count as untouched again, so they do not complain right away.
    expect(element.textContent).not.toContain('Bitte gib deinen Namen ein.');
  });

  it('shows why sending failed', async () => {
    const { element } = await render(failed(new Failure('network', 'Offline')));

    expect(element.querySelector('app-failure-alert')?.textContent).toContain(
      'Die Nachricht wurde nicht gesendet',
    );
  });
});
