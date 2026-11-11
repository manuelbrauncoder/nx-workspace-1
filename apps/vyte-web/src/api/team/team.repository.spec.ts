import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { EditorInviteDto, MemberDto } from './member.dto';
import { TeamRepository } from './team.repository';

const EVENT = 'https://api.example.com/events/e%2F1';
const MEMBER_DTO: MemberDto = {
  userId: 'u1',
  name: 'Ada',
  email: 'ada@example.com',
  role: 'owner',
  joinedAt: '2026-11-11T09:00:00.000Z',
};
const INVITE_DTO: EditorInviteDto = {
  id: 'i1',
  token: 'tok',
  expiresAt: '2026-11-18T09:00:00.000Z',
  createdAt: '2026-11-11T09:00:00.000Z',
};

describe('TeamRepository', () => {
  let repository: TeamRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(TeamRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the members of an event and maps them', async () => {
    const members = firstValueFrom(repository.getMembers('e/1'));
    const request = backend.expectOne(`${EVENT}/members`);
    request.flush({ members: [MEMBER_DTO] });

    expect(request.request.method).toBe('GET');
    expect((await members)[0].joinedAt).toEqual(new Date(MEMBER_DTO.joinedAt));
  });

  it('removes a member with DELETE and encodes the user id', async () => {
    const done = firstValueFrom(repository.removeMember('e/1', 'u/2'), {
      defaultValue: undefined,
    });
    const request = backend.expectOne(`${EVENT}/members/u%2F2`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });

  it('hands the event over with PUT and answers with the team', async () => {
    const members = firstValueFrom(repository.handOver('e/1', 'u2'));
    const request = backend.expectOne(`${EVENT}/owner`);
    request.flush({
      members: [
        { ...MEMBER_DTO, userId: 'u2' },
        { ...MEMBER_DTO, role: 'editor' },
      ],
    });

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ userId: 'u2' });
    expect((await members).map((member) => member.role)).toEqual(['owner', 'editor']);
  });

  it('loads the open invites', async () => {
    const invites = firstValueFrom(repository.getInvites('e/1'));
    backend.expectOne(`${EVENT}/invites`).flush({ invites: [INVITE_DTO] });

    expect((await invites)[0].expiresAt).toEqual(new Date(INVITE_DTO.expiresAt));
  });

  it('creates an invite with POST', async () => {
    const invite = firstValueFrom(repository.createInvite('e/1'));
    const request = backend.expectOne(`${EVENT}/invites`);
    request.flush({ invite: INVITE_DTO }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect((await invite).token).toBe('tok');
  });

  it('deletes an invite with DELETE', async () => {
    const done = firstValueFrom(repository.deleteInvite('e/1', 'i/1'), {
      defaultValue: undefined,
    });
    const request = backend.expectOne(`${EVENT}/invites/i%2F1`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });
});
