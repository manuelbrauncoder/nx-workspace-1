import { ApplicationRef, Injector, runInInjectionContext } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { patchResource } from './patch-resource';

describe('patchResource', () => {
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  function resourceOf(stream: () => Observable<string[]>) {
    return runInInjectionContext(TestBed.inject(Injector), () =>
      rxResource({ stream, defaultValue: [] as string[] }),
    );
  }

  it('changes a loaded resource without refetching', async () => {
    const stream = vi.fn(() => of(['a']));
    const resource = resourceOf(stream);
    await settle();

    patchResource(resource, (values) => [...values, 'b']);
    await settle();

    expect(resource.value()).toEqual(['a', 'b']);
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it('leaves a first load running instead of cancelling it', async () => {
    const response = new Subject<string[]>();
    const stream = vi.fn(() => response);
    const resource = resourceOf(stream);
    TestBed.inject(ApplicationRef).tick();
    expect(resource.status()).toBe('loading');

    patchResource(resource, (values) => [...values, 'b']);
    response.next(['a']);
    response.complete();
    await settle();

    expect(resource.value()).toEqual(['a']);
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it('refetches a failed resource', async () => {
    let fail = true;
    const stream = vi.fn(() => (fail ? throwError(() => new Error('offline')) : of(['a'])));
    const resource = resourceOf(stream);
    await settle();
    expect(resource.status()).toBe('error');

    fail = false;
    patchResource(resource, (values) => [...values, 'b']);
    await settle();

    expect(resource.value()).toEqual(['a']);
    expect(stream).toHaveBeenCalledTimes(2);
  });
});
