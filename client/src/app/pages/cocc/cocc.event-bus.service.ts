// event-bus.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { CoccEvent, CoccEventType } from './cocc.event-bus.model';

@Injectable({ providedIn: 'root' })
export class CoccEventBusService {
  // 使用 Subject 作为事件流（无历史记录）
  private _eventStream = new Subject<CoccEvent>();

  /**
   * 发送事件
   * @param event 严格符合 CoccEvent 类型的事件对象
   */
  dispatch<T extends CoccEvent>(event: T): void {
    this._eventStream.next(event);
  }

  /**
   * 监听特定类型的事件
   * @param eventType 事件类型字面量（如 'USER_LOGIN'）
   * @returns 返回带有正确类型推断的 Observable
   */
  on<T extends CoccEventType>(
    eventType: T,
  ): Observable<Extract<CoccEvent, { type: T }>['payload']> {
    return this._eventStream.pipe(
      filter((e) => e.type === eventType),
      map((e) => (e as Extract<CoccEvent, { type: T }>).payload),
    );
  }

  /**
   * 清除所有事件监听（可选）
   */
  clear(): void {
    this._eventStream = new Subject<CoccEvent>();
  }
}
