import { TestBed } from '@angular/core/testing';
import { RecentPlayers } from './recent-players';

describe('RecentPlayers', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [RecentPlayers] });
  });

  it('puts the latest names in front and drops duplicates regardless of case', () => {
    const recent = TestBed.inject(RecentPlayers);
    recent.remember(['Ada', 'Linus']);
    recent.remember(['linus', ' Grace ']);

    expect(recent.load()).toEqual(['linus', 'Grace', 'Ada']);
  });

  it('ignores broken storage', () => {
    localStorage.setItem('dartomat.players.v1', '{nope');

    expect(TestBed.inject(RecentPlayers).load()).toEqual([]);
  });
});
