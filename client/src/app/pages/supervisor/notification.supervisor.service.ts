import { Injectable, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { NotificationDomComponent } from './notification-dom/notification-dom.component';

export interface NotificationDiffResult {
  added: Extreme.NotificationWithReadState[];
  removedIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SupervisorNotificationService {
  dom?: NotificationDomComponent;
  notifications = signal<Extreme.NotificationWithReadState[]>([]);
  cacheNotificationIds: string[] = [];
  initialized = false;
  fetched$ = new Subject<Extreme.NotificationWithReadState[]>();
  diff$ = new Subject<NotificationDiffResult>();

  pollingTimer?: NodeJS.Timeout;

  constructor(
    private api: ApiService,
    private message: NzMessageService,
  ) {
    this.fetchData();
    this.polling();
  }

  link(dom: NotificationDomComponent) {
    this.dom = dom;
  }

  async fetchData() {
    const data = await this.api.extreme.getNotificationList();
    if (!this.initialized) {
      this.initialized = true;
      this.cacheNotificationIds = data.map((d) => d.id);
      const newOne = data.find((n) => !n.isRead);
      if (newOne) {
        setTimeout(() => {
          this.show(this.getMessageFromNotification(newOne));
        }, 1000);
      }
    } else {
      this.diffPrevious(data);
    }
    this.notifications.set(data);

    this.fetched$.next(data);
  }

  diffPrevious(nos: Extreme.NotificationWithReadState[]) {
    const cacheIds = this.cacheNotificationIds;
    const added = nos.filter((no) => !cacheIds.includes(no.id));
    const removedIds = cacheIds.filter((id) => !nos.find((no) => no.id === id));
    this.cacheNotificationIds = nos.map((no) => no.id);
    const result: NotificationDiffResult = { added, removedIds };
    if (added.length || removedIds.length) {
      this.diff$.next(result);
    }
    if (added.length) {
      this.show(this.getMessageFromNotification(added[0]));
    }
    if (removedIds.length) {
      this.message.info(`${removedIds.length}条消息被撤回`);
    }
    return result;
  }

  read(id: string) {
    this.api.extreme.readNotification(id).then(() => {
      this.notifications.update((prev) => {
        return prev.map((d) => {
          if (d.id === id) {
            return { ...d, isRead: 1 };
          }
          return d;
        });
      });
      this.fetched$.next(this.notifications());
    });
  }

  show(message: string) {
    this.dom?.tip(message);
  }
  getMessageFromNotification(n: Extreme.NotificationWithReadState) {
    let subfix = n.type;
    if (subfix !== '重要运营调整') {
      subfix = `${n.type}通告`;
    }
    if (n.lines.includes('全线网')) {
      return `全线网-${subfix}`;
    }
    if (n.lines.length > 1) {
      return `多线路-${subfix}`;
    }
    if (n.lines.length === 1) {
      if (n.lines[0] === '机场联络线') {
        return `机场线-${subfix}`;
      }
      return `${n.lines[0]}-${subfix}`;
    }
    return '新消息';
  }

  polling() {
    this.pollingTimer = setInterval(() => {
      this.fetchData();
    }, 10000);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
  }
}
