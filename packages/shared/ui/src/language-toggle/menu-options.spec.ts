import { THEME_MENU_OPTIONS } from '../theme-toggle/theme-toggle';
import { LANGUAGE_MENU_OPTIONS } from './language-toggle';

describe('menu options', () => {
  it('lists German and English with their own names', () => {
    expect(LANGUAGE_MENU_OPTIONS.map((option) => option.language)).toEqual(['de', 'en']);
    LANGUAGE_MENU_OPTIONS.forEach((option) => expect(option.label).toBeTruthy());
  });

  it('lists light, dark and system', () => {
    expect(THEME_MENU_OPTIONS.map((option) => option.mode)).toEqual(['light', 'dark', 'system']);
    expect(THEME_MENU_OPTIONS.map((option) => option.labelKey)).toEqual([
      'theme.light',
      'theme.dark',
      'theme.system',
    ]);
  });
});
