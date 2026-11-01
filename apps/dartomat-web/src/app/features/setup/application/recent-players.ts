import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';

/** Kept from the earlier Dartomat, so the names a browser knew stay. */
const STORAGE_KEY = 'dartomat.players.v1';
const LIMIT = 16;

/** The names of the last games on this device, newest first. Lives in `localStorage` only. */
@Service({ autoProvided: false })
export class RecentPlayers {
  private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  load(): string[] {
    if (!this._isBrowser) {
      return [];
    }
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(stored)
        ? stored.filter((name): name is string => typeof name === 'string').slice(0, LIMIT)
        : [];
    } catch {
      return [];
    }
  }

  /** Puts `names` in front, drops duplicates regardless of case. */
  remember(names: string[]): void {
    if (!this._isBrowser) {
      return;
    }
    const seen = new Set<string>();
    const merged = [...names, ...this.load()]
      .map((name) => name.trim())
      .filter((name) => {
        const key = name.toLowerCase();
        if (!name || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, LIMIT);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Storage unavailable (e.g. private mode): the names are simply not remembered.
    }
  }
}
