import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { ContactMessage } from './contact-message';
import { ContactMessageDtoMapper } from './contact-message-dto.mapper';
import { ReceivedMessage } from './received-message';
import { ReceivedMessageDtoMapper } from './received-message-dto.mapper';
import { ReceivedMessageResponseDto, ReceivedMessagesResponseDto } from './received-message.dto';

/**
 * Talks to the contact endpoints of the backend: sending is public, reading and managing the
 * received messages is admin only.
 */
@Service()
export class ContactRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(ContactMessageDtoMapper);
  private readonly _receivedMapper = inject(ReceivedMessageDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/contact`;
  }

  /** Hands the message to the backend, which forwards it by email. Answers without a body. */
  send(message: ContactMessage): Observable<void> {
    return this._http.post(this._url, this._mapper.toDto(message)).pipe(map(() => undefined));
  }

  /** Every received message, newest first. Admin only. */
  getMessages(): Observable<ReceivedMessage[]> {
    return this._http
      .get<ReceivedMessagesResponseDto>(`${this._url}/messages`)
      .pipe(map((response) => this._receivedMapper.toModels(response.messages)));
  }

  /** Marks a message as read or unread. Admin only. */
  setRead(id: string, read: boolean): Observable<ReceivedMessage> {
    return this._http
      .patch<ReceivedMessageResponseDto>(this._messageUrl(id), this._receivedMapper.toReadDto(read))
      .pipe(map((response) => this._receivedMapper.toModel(response.message)));
  }

  /** Admin only. */
  deleteMessage(id: string): Observable<void> {
    return this._http.delete<void>(this._messageUrl(id));
  }

  private _messageUrl(id: string): string {
    return `${this._url}/messages/${encodeURIComponent(id)}`;
  }
}
