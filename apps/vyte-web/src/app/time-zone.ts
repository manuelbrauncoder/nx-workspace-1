/**
 * The zone dates are shown in when they belong to nothing with a zone of its own, e.g. when an
 * account was created. vyte is used in one country; a fixed zone lets the server, which runs in
 * UTC, render the same dates as the browser. Events have a zone of their own and use that.
 */
export const APP_TIME_ZONE = 'Europe/Berlin';
