import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '@core/i18n/i18n.service';
import { formatLocalDate } from '@core/i18n/local-date';
import { VyteEvent } from '../../domain/event';

export type EventTimeFields = Pick<VyteEvent, 'allDay' | 'startsAt' | 'endsAt' | 'timeZone'>;

/**
 * When an event takes place, in words: `Sa., 14. März 2027, 19:00 bis 02:00 Uhr`. Always in the
 * zone of the event, so the server (UTC) and every browser show the same times.
 */
export function describeEventTime(event: EventTimeFields, i18n: I18nService): string {
  const locale = i18n.locale();
  const format = (date: Date, as: 'weekdayDate' | 'time' | 'date') =>
    formatLocalDate(date, locale, as, event.timeZone);
  const start = event.startsAt;
  const end = event.endsAt;
  const sameDay = end !== null && format(end, 'date') === format(start, 'date');

  if (event.allDay) {
    return end && !sameDay
      ? i18n.translate('events.when.days', {
          start: format(start, 'weekdayDate'),
          end: format(end, 'weekdayDate'),
        })
      : i18n.translate('events.when.allDay', { date: format(start, 'weekdayDate') });
  }
  if (!end) {
    return i18n.translate('events.when.at', {
      date: format(start, 'weekdayDate'),
      time: format(start, 'time'),
    });
  }
  // "19 bis 2 Uhr" reads as one evening, a longer event names both days.
  const lessThanADay = end.getTime() - start.getTime() < 24 * 60 * 60 * 1000;
  if (sameDay || lessThanADay) {
    return i18n.translate('events.when.range', {
      date: format(start, 'weekdayDate'),
      start: format(start, 'time'),
      end: format(end, 'time'),
    });
  }
  return i18n.translate('events.when.days', {
    start: `${format(start, 'weekdayDate')}, ${format(start, 'time')}`,
    end: `${format(end, 'weekdayDate')}, ${format(end, 'time')}`,
  });
}

/** The time of an event as one line, see `describeEventTime`. */
@Component({
  selector: 'app-event-when',
  styleUrl: './event-when.scss',
  templateUrl: './event-when.html',
})
export class EventWhen {
  readonly event = input.required<EventTimeFields>();

  private readonly _i18n = inject(I18nService);
  private readonly _text = computed(() => describeEventTime(this.event(), this._i18n));
}
