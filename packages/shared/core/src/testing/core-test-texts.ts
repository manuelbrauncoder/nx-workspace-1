import { defineI18nSharedTexts } from '../i18n/i18n-scope';

/** Shared texts for the specs of `core`, which must not depend on the texts of an app or `ui`. */
const de = {
  seo: {
    defaultDescription: 'Beschreibung der Test-App',
    imageAlt: 'Logo der Test-App',
  },
  test: {
    cancel: 'Abbrechen',
    close: 'Schließen',
    retry: 'Erneut versuchen',
  },
};

const en: typeof de = {
  seo: {
    defaultDescription: 'Description of the test app',
    imageAlt: 'Logo of the test app',
  },
  test: {
    cancel: 'Cancel',
    close: 'Close',
    retry: 'Try again',
  },
};

declare module '../i18n/translation-key' {
  interface I18nSharedTexts {
    test: (typeof de)['test'];
  }
}

export const coreTestDe = de;

export const coreTestI18n = defineI18nSharedTexts<typeof de>({
  de: () => Promise.resolve({ default: de }),
  en: () => Promise.resolve({ default: en }),
});

/** Value of `APP_NAME` in the specs of `core`. */
export const CORE_TEST_APP_NAME = 'test-app';
