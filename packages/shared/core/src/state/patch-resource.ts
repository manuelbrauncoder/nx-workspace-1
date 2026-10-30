import { WritableResource } from '@angular/core';

/**
 * Applies a successful write to a loaded resource without refetching. Writing to a resource that
 * is still loading would cancel that load, so the change is skipped then: a first load keeps
 * running, a reloading or failed resource is refetched.
 */
export function patchResource<T>(resource: WritableResource<T>, change: (value: T) => T): void {
  const status = resource.status();
  if (status === 'resolved' || status === 'local') {
    resource.update(change);
  } else {
    resource.reload();
  }
}
