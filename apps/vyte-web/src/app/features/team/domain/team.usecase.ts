import { inject, Service } from '@angular/core';
import { EventsRepository } from '@api/events/events.repository';
import { TeamRepository } from '@api/team/team.repository';
import { Observable } from 'rxjs';
import { EditorInvite, Member, VyteEvent } from './team';

/**
 * What the team page can do. Combines two API layers: the team itself and its event, whose
 * title and state the page shows.
 */
@Service({ autoProvided: false })
export class TeamUseCase {
  private readonly _team = inject(TeamRepository);
  private readonly _events = inject(EventsRepository);

  getEvent(eventId: string): Observable<VyteEvent> {
    return this._events.getById(eventId);
  }

  /** The owner first, then the editors in the order they joined. */
  getMembers(eventId: string): Observable<Member[]> {
    return this._team.getMembers(eventId);
  }

  /** The owner removes an editor, or an editor leaves by removing themself. */
  removeMember(eventId: string, userId: string): Observable<void> {
    return this._team.removeMember(eventId, userId);
  }

  /** Resolves with the team in its new roles. */
  handOver(eventId: string, userId: string): Observable<Member[]> {
    return this._team.handOver(eventId, userId);
  }

  getInvites(eventId: string): Observable<EditorInvite[]> {
    return this._team.getInvites(eventId);
  }

  createInvite(eventId: string): Observable<EditorInvite> {
    return this._team.createInvite(eventId);
  }

  deleteInvite(eventId: string, inviteId: string): Observable<void> {
    return this._team.deleteInvite(eventId, inviteId);
  }
}
