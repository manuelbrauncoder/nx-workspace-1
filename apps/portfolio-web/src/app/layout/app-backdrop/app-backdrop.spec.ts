import { TestBed } from '@angular/core/testing';
import { AppBackdrop } from './app-backdrop';

describe('AppBackdrop', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: false, media: query })),
    );
    window.matchMedia = globalThis.matchMedia;
  });
  afterEach(() => vi.restoreAllMocks());

  async function render() {
    const fixture = TestBed.createComponent(AppBackdrop);
    await fixture.whenStable();
    return fixture;
  }

  it('is hidden from assistive technology', async () => {
    const fixture = await render();

    expect((fixture.nativeElement as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });

  it('renders four blobs', async () => {
    const fixture = await render();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.backdrop__blob').length).toBe(4);
  });

  it('starts listening and removes every listener on destroy', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const fixture = await render();

    const added = add.mock.calls.map(([type]) => type);
    expect(added).toEqual(expect.arrayContaining(['scroll', 'resize', 'pointermove']));

    fixture.destroy();

    for (const type of ['scroll', 'resize', 'pointermove']) {
      const handler = add.mock.calls.find(([name]) => name === type)![1];
      expect(remove).toHaveBeenCalledWith(type, handler);
    }
  });

  it('does not follow the pointer with reduced motion', async () => {
    window.matchMedia = vi.fn(
      (query: string) => ({ matches: true, media: query }) as MediaQueryList,
    );
    const add = vi.spyOn(window, 'addEventListener');
    await render();

    const added = add.mock.calls.map(([type]) => type);
    expect(added).toContain('scroll');
    expect(added).not.toContain('pointermove');
  });

  it('sets the scroll position on the host', async () => {
    const fixture = await render();

    expect((fixture.nativeElement as HTMLElement).style.getPropertyValue('--scroll')).toBe(
      '0.0000',
    );
  });
});
