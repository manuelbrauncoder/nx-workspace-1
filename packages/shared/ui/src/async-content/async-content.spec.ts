import { Component, RESPONSE_INIT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { AsyncState, failed, success } from '@core/state/async-state';
import { AsyncContent } from './async-content';

@Component({
  selector: 'app-host',
  imports: [AsyncContent],
  template: `
    <app-async-content
      [state]="state()"
      [failureHeadingLevel]="3"
      failureHeading="Laden fehlgeschlagen"
    >
      <ng-template><p>Inhalt</p></ng-template>
    </app-async-content>
  `,
})
class Host {
  readonly state = signal<AsyncState>(success());
}

describe('AsyncContent', () => {
  function render(state: AsyncState) {
    const response: ResponseInit = {};
    TestBed.configureTestingModule({
      providers: [{ provide: RESPONSE_INIT, useValue: response }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.state.set(state);
    fixture.detectChanges();
    return { response, element: fixture.nativeElement as HTMLElement };
  }

  it('renders the content and leaves the response status alone on success', () => {
    const { response, element } = render(success());

    expect(element.querySelector('p')?.textContent).toBe('Inhalt');
    expect(response.status).toBeUndefined();
  });

  it('passes the status of a failure on to the server response', () => {
    const { response, element } = render(
      failed(new Failure('not-found', 'Not found', { status: 404 })),
    );

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(response.status).toBe(404);
  });

  it('answers with 503 when the failure has no HTTP status', () => {
    const { response } = render(failed(new Failure('network', 'Unreachable', { status: 0 })));

    expect(response.status).toBe(503);
  });

  it('passes the level of the failure heading on', () => {
    const { element } = render(failed(new Failure('server', 'Down')));

    expect(element.querySelector('[role="heading"]')?.getAttribute('aria-level')).toBe('3');
  });
});
