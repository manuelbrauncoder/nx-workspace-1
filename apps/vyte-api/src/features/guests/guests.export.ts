/** The texts of the export in the languages of the web app. German is the default. */
const TEXTS = {
  de: {
    columns: [
      'Name',
      'Begleitung erlaubt',
      'Antwort',
      'Begleitung',
      'Personen',
      'Nachricht',
      'Notiz',
      'Eingetragen von',
      'Geantwortet am',
    ],
    response: { pending: 'Offen', accepted: 'Zugesagt', declined: 'Abgesagt' },
    answeredBy: { guest: 'Gast', host: 'Host' },
    file: 'gaeste',
  },
  en: {
    columns: [
      'Name',
      'Companions allowed',
      'Answer',
      'Companions',
      'People',
      'Message',
      'Note',
      'Answered by',
      'Answered at',
    ],
    response: { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' },
    answeredBy: { guest: 'Guest', host: 'Host' },
    file: 'guests',
  },
} as const;

export type ExportLanguage = keyof typeof TEXTS;

export interface ExportGuest {
  name: string;
  maxCompanions: number;
  response: 'pending' | 'accepted' | 'declined';
  companions: number;
  message: string | null;
  note: string | null;
  answeredBy: 'guest' | 'host' | null;
  respondedAt: Date | null;
}

/**
 * One cell. Text a spreadsheet would run as a formula (`=`, `+`, `-`, `@`, also after leading
 * blanks or after a `,` or `;`, and tab or carriage return at the start) gets a `'` in front of
 * the trigger; line breaks become spaces; every cell is quoted, with `"` doubled.
 */
function cell(value: string | number | null): string {
  if (value === null) return '""';
  let text = String(value);
  if (typeof value === 'string') {
    // one line per guest, also for a spreadsheet that splits on another separator
    text = text.replace(/[\r\n]+/g, ' ');
    if (/^[\s]*[=+\-@]|^[\t\r]/.test(text)) text = `'${text}`;
    // a spreadsheet that splits on `,` (English locales) would start a cell after a separator
    text = text.replace(/([,;]\s*)([=+\-@])/g, "$1'$2");
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/** `2027-03-14 19:05` in the event's time zone. */
function localTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(instant);
}

/**
 * The guest list as CSV for Excel: UTF-8 with BOM, `;` between cells, CRLF between rows, the
 * times in the event's time zone (docs/vyte/spec.md section 5).
 */
export function guestsCsv(
  guests: ExportGuest[],
  { timeZone, language }: { timeZone: string; language: ExportLanguage },
): string {
  const texts = TEXTS[language];
  const rows = [
    texts.columns.map(cell),
    ...guests.map((guest) => {
      const people = guest.response === 'accepted' ? 1 + guest.companions : 0;
      return [
        cell(guest.name),
        cell(guest.maxCompanions),
        cell(texts.response[guest.response]),
        cell(guest.response === 'accepted' ? guest.companions : 0),
        cell(people),
        cell(guest.message),
        cell(guest.note),
        cell(guest.answeredBy && texts.answeredBy[guest.answeredBy]),
        cell(guest.respondedAt && localTime(guest.respondedAt, timeZone)),
      ];
    }),
  ];
  return '\uFEFF' + rows.map((row) => row.join(';')).join('\r\n') + '\r\n';
}

/** `Annas-30-Geburtstag-gaeste.csv`: letters and digits of the title, then the list's name. */
export function exportFileName(title: string, language: ExportLanguage): string {
  const base = title.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '-');
  // cut by code points, not UTF-16 units: half a surrogate pair breaks the download header
  const cut = Array.from(base)
    .slice(0, 60)
    .join('')
    .replace(/^-+|-+$/g, '');
  return `${cut ? `${cut}-` : ''}${TEXTS[language].file}.csv`;
}
