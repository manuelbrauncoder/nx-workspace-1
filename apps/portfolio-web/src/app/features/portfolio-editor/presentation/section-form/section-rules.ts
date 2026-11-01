import {
  email,
  maxLength,
  PathKind,
  required,
  SchemaPath,
  SchemaPathRules,
  SchemaPathTree,
  validate,
} from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized } from '@core/i18n/localized';

// Validation shared by the forms of every section. Messages are functions, so a visible error
// follows the language.

type Path<T, K extends PathKind> = SchemaPath<T, SchemaPathRules.Supported, K>;

export interface TextRule {
  max: number;
  /** An optional field may stay empty. */
  optional?: boolean;
}

/** A list in a textarea, one entry per line. */
export interface LinesRule {
  /** How many entries at most. */
  max: number;
  /** How long one entry may be. */
  maxLength: number;
  optional?: boolean;
}

const URL_PATTERN = /^https?:\/\/\S+$/;

/** The entries of a textarea with one entry per line, without blank lines. */
export const toLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

export const fromLines = (lines: readonly string[] | undefined): string => (lines ?? []).join('\n');

export function textRules<K extends PathKind = PathKind.Root>(
  path: Path<string, K>,
  i18n: I18nService,
  rule: TextRule,
): void {
  if (!rule.optional) {
    required(path, { message: () => i18n.translate('sectionEditor.validation.required') });
    // Spaces alone do not count, the backend trims them away.
    validate(path, ({ value }) =>
      value() !== '' && value().trim() === ''
        ? { kind: 'blank', message: i18n.translate('sectionEditor.validation.required') }
        : undefined,
    );
  }
  maxLength(path, rule.max, {
    message: () => i18n.translate('sectionEditor.validation.tooLong', { max: rule.max }),
  });
}

/**
 * Both languages of a text. An optional one is either empty in both languages or filled in
 * both, so the start page never misses a text in one of them.
 */
export function localizedRules<K extends PathKind = PathKind.Root>(
  path: SchemaPathTree<Localized<string>, K>,
  i18n: I18nService,
  rule: TextRule,
): void {
  textRules(path.de, i18n, rule);
  textRules(path.en, i18n, rule);
  if (rule.optional) {
    for (const [own, other] of [
      [path.de, path.en],
      [path.en, path.de],
    ] as const) {
      validate(own, ({ value, valueOf }) =>
        value().trim() === '' && valueOf(other).trim() !== ''
          ? {
              kind: 'otherLanguage',
              message: i18n.translate('sectionEditor.validation.bothLanguages'),
            }
          : undefined,
      );
    }
  }
}

export function linesRules<K extends PathKind = PathKind.Root>(
  path: Path<string, K>,
  i18n: I18nService,
  rule: LinesRule,
): void {
  if (!rule.optional) {
    required(path, { message: () => i18n.translate('sectionEditor.validation.required') });
  }
  validate(path, ({ value }) => {
    const lines = toLines(value());
    if (lines.length > rule.max) {
      return {
        kind: 'tooManyLines',
        message: i18n.translate('sectionEditor.validation.tooManyLines', { max: rule.max }),
      };
    }
    if (lines.some((line) => line.length > rule.maxLength)) {
      return {
        kind: 'lineTooLong',
        message: i18n.translate('sectionEditor.validation.lineTooLong', { max: rule.maxLength }),
      };
    }
    return undefined;
  });
}

export function localizedLinesRules<K extends PathKind = PathKind.Root>(
  path: SchemaPathTree<Localized<string>, K>,
  i18n: I18nService,
  rule: LinesRule,
): void {
  linesRules(path.de, i18n, rule);
  linesRules(path.en, i18n, rule);
}

/** A web address with `http://` or `https://`. */
export function urlRules<K extends PathKind = PathKind.Root>(
  path: Path<string, K>,
  i18n: I18nService,
  rule: TextRule,
): void {
  textRules(path, i18n, rule);
  validate(path, ({ value }) =>
    value().trim() !== '' && !URL_PATTERN.test(value().trim())
      ? { kind: 'url', message: i18n.translate('sectionEditor.validation.url') }
      : undefined,
  );
}

export function emailRules<K extends PathKind = PathKind.Root>(
  path: Path<string, K>,
  i18n: I18nService,
): void {
  required(path, { message: () => i18n.translate('sectionEditor.validation.required') });
  email(path, { message: () => i18n.translate('sectionEditor.validation.email') });
}
