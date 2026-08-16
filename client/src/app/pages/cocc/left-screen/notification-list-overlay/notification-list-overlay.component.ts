import { Component, effect, input, output, signal } from '@angular/core';
import dayjs from 'dayjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ApiService } from '../../../../services/api.service';
import { getLineMark } from '../../../case-detail/services/meta';
import { NotificationDetailComponent } from './notification-detail/notification-detail.component';

@Component({
  selector: 'cocc-notification-list-overlay',
  imports: [NotificationDetailComponent, LibraryNzModule],
  templateUrl: './notification-list-overlay.component.html',
  styleUrl: './notification-list-overlay.component.less',
})
export class NotificationListOverlayComponent {
  events = input<ExtremeOcc.Event[]>([]);
  visible = input(false);
  onAdd = output<void>();
  onClose = output<void>();
  onLocate = output<ExtremeOcc.Event>();

  activeId = signal<string | null>(null);

  notifications = signal<Extreme.Notification[]>([]);

  constructor(
    private api: ApiService,
    private readonly message: NzMessageService,
  ) {
    effect(() => {
      if (this.visible()) {
        this.fetchData();
      }
    });
  }

  async fetchData() {
    const data = await this.api.extreme.getNotificationList();
    this.notifications.set(data);
  }
  getPublishTime(no: Extreme.Notification) {
    return dayjs(no.createTime).format('MM/DD HH:mm');
  }
  getLineMark(lineName: string) {
    return getLineMark(lineName);
  }
  onPlusClick() {
    this.onAdd.emit();
  }
  onCloseClick() {
    this.onClose.emit();
  }
  handleWithdraw(id: string) {
    this.api.extreme.removeNotification(id).then(() => {
      this.fetchData();
      this.message.success('撤回成功');
    });
  }
  onViewDetail(id: string) {
    this.activeId.set(id);
  }
}
