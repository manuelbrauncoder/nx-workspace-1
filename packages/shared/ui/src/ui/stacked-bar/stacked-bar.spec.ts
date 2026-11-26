import { TestBed } from '@angular/core/testing';
import { UiStackedBar, UiStackedBarSegment } from './stacked-bar';

describe('UiStackedBar', () => {
  async function render(segments: UiStackedBarSegment[]) {
    const fixture = TestBed.createComponent(UiStackedBar);
    fixture.componentRef.setInput('segments', segments);
    fixture.componentRef.setInput('label', 'Gäste nach Antwort');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const answers: UiStackedBarSegment[] = [
    { label: 'Zusagen', value: 3, color: 'rgb(0, 128, 0)' },
    { label: 'Absagen', value: 0, color: 'rgb(255, 0, 0)' },
    { label: 'Offen', value: 1, color: 'rgb(128, 128, 128)' },
  ];

  it('tells every segment in the legend, also one without a value', async () => {
    const element = await render(answers);

    const items = Array.from(element.querySelectorAll('li'), (item) =>
      item.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(items).toEqual(['Zusagen 3', 'Absagen 0', 'Offen 1']);
  });

  it('draws only the segments with a value, by their share, hidden from screen readers', async () => {
    const element = await render(answers);

    const track = element.querySelector('.ui-stacked-bar__track');
    const parts = Array.from(element.querySelectorAll<HTMLElement>('.ui-stacked-bar__part'));
    expect(track?.getAttribute('aria-hidden')).toBe('true');
    expect(parts.map((part) => part.style.flexGrow)).toEqual(['75', '25']);
    expect(parts[0].style.backgroundColor).toBe('rgb(0, 128, 0)');
  });

  it('names the legend, a list also without a list style', async () => {
    const element = await render(answers);

    const legend = element.querySelector('ul');
    expect(legend?.getAttribute('aria-label')).toBe('Gäste nach Antwort');
    expect(legend?.getAttribute('role')).toBe('list');
  });

  it('draws an empty bar when everything is zero', async () => {
    const element = await render(answers.map((segment) => ({ ...segment, value: 0 })));

    expect(element.querySelectorAll('.ui-stacked-bar__part')).toHaveLength(0);
    expect(element.querySelectorAll('li')).toHaveLength(3);
  });

  it('has no accessibility violations', async () => {
    await expect(await render(answers)).toBeAccessible();
  });
});
