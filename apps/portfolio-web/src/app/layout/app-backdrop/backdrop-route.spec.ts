import { ActivatedRouteSnapshot, Data } from '@angular/router';
import { hasBackdrop, withBackdrop } from './backdrop-route';

/** A snapshot chain of routes, each with its `data`, the first one is the root. */
function chain(...datas: Data[]): ActivatedRouteSnapshot {
  const snapshots = datas.map(
    (data) =>
      ({ data, firstChild: null }) as unknown as {
        data: Data;
        firstChild: unknown;
      },
  );
  snapshots.forEach((snapshot, index) => (snapshot.firstChild = snapshots[index + 1] ?? null));
  return snapshots[0] as unknown as ActivatedRouteSnapshot;
}

describe('backdrop route data', () => {
  it('withBackdrop builds data that turns the backdrop on', () => {
    expect(hasBackdrop(chain(withBackdrop()))).toBe(true);
  });

  it('is off without the data', () => {
    expect(hasBackdrop(chain({}, {}, { title: 'x' }))).toBe(false);
  });

  it('finds the flag on a parent route of the chain', () => {
    expect(hasBackdrop(chain({}, withBackdrop(), {}))).toBe(true);
  });

  it('finds the flag on the deepest route', () => {
    expect(hasBackdrop(chain({}, {}, withBackdrop()))).toBe(true);
  });

  it('only accepts the value true', () => {
    expect(hasBackdrop(chain({ appBackdrop: 'yes' }, { appBackdrop: 1 }))).toBe(false);
  });
});
