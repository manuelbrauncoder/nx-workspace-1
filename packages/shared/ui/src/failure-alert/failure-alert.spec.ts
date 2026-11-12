import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { FailureAlert } from './failure-alert';

describe('FailureAlert', () => {
  const FAILURE = new Failure('server', 'Server error');

  async function render(retryable: boolean, failure = FAILURE, message?: string) {
    const fixture = TestBed.createComponent(FailureAlert);
    fixture.componentRef.setInput('heading', 'Laden fehlgeschlagen');
    fixture.componentRef.setInput('failure', failure);
    fixture.componentRef.setInput('message', message);
    fixture.componentRef.setInput('retryable', retryable);
    await fixture.whenStable();
    return fixture;
  }

  it('announces the heading and the failure message', async () => {
    const alert = (await render(false)).nativeElement.querySelector('[role="alert"]');

    expect(alert.textContent).toContain('Laden fehlgeschlagen');
    expect(alert.textContent).toContain('Auf dem Server ist ein Fehler aufgetreten.');
    expect(alert.querySelector('button')).toBeNull();
  });

  it('shows the translated text of the kind, not the message for the log', async () => {
    const fixture = await render(false, new Failure('not-found', 'Not found'));
    const text = fixture.nativeElement.querySelector('[role="alert"]').textContent;

    expect(text).toContain('Der Eintrag wurde nicht gefunden.');
    expect(text).not.toContain('Not found');
  });

  it('shows the message of the page instead of the generic text', async () => {
    const fixture = await render(false, new Failure('unauthorized', 'Unauthorized'), 'Falsch.');
    const text = fixture.nativeElement.querySelector('[role="alert"]').textContent;

    expect(text).toContain('Falsch.');
    expect(text).not.toContain('Du bist nicht angemeldet.');
  });

  it('emits retry from the retry button', async () => {
    const fixture = await render(true);
    const retried = vi.fn();
    fixture.componentInstance.retry.subscribe(retried);

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(retried).toHaveBeenCalledOnce();
  });

  it('puts its heading on level 2 of the outline, or on the level it is given', async () => {
    const fixture = await render(false);
    const heading = () => fixture.nativeElement.querySelector('[role="heading"]') as HTMLElement;
    expect(heading().getAttribute('aria-level')).toBe('2');
    expect(heading().textContent?.trim()).toBe('Laden fehlgeschlagen');

    fixture.componentRef.setInput('headingLevel', 3);
    await fixture.whenStable();

    expect(heading().getAttribute('aria-level')).toBe('3');
  });
});
