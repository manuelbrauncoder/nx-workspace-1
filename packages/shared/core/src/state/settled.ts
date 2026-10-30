import { Injector, Resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

/**
 * Resolves once the resource is no longer loading, whether it succeeded or failed. Lets a route
 * guard wait for the data of a page, e.g. so a `#fragment` link finds its target right away.
 */
export async function settled(resource: Resource<unknown>, injector: Injector): Promise<void> {
  await firstValueFrom(
    toObservable(resource.isLoading, { injector }).pipe(filter((loading) => !loading)),
  );
}
