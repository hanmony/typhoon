// event-bus.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { OccEvent, OccEventType } from './occ.event-bus.model';

@Injectable({ providedIn: 'root' })
export class OccEventBusService {
  // 使用 Subject 作为事件流（无历史记录）
  private _eventStream = new Subject<OccEvent>();

  /**
   * 发送事件
   * @param event 严格符合 OccEvent 类型的事件对象
   */
  dispatch<T extends OccEvent>(event: T): void {
    this._eventStream.next(event);
  }

  /**
   * 监听特定类型的事件
   * @param eventType 事件类型字面量（如 'USER_LOGIN'）
   * @returns 返回带有正确类型推断的 Observable
   */
  on<T extends OccEventType>(
    eventType: T,
  ): Observable<Extract<OccEvent, { type: T }>['payload']> {
    return this._eventStream.pipe(
      filter((e) => e.type === eventType),
      map((e) => (e as Extract<OccEvent, { type: T }>).payload),
    );
  }

  /**
   * 清除所有事件监听（可选）
   */
  clear(): void {
    this._eventStream = new Subject<OccEvent>();
  }
}
