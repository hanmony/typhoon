import { Component, effect, input, output, signal } from '@angular/core';
import dayjs from 'dayjs';
import { horizontalInOutReverse } from '../../../common.animation';
import { getLineMark } from '../../case-detail/services/meta';
import { SupervisorNotificationService } from '../notification.supervisor.service';
import { SupervisorNotificationDetailComponent } from './notification-detail/notification-detail.component';

@Component({
  selector: 'supervisor-notification-list-overlay',
  imports: [SupervisorNotificationDetailComponent],
  templateUrl: './notification-list-overlay.component.html',
  styleUrl: './notification-list-overlay.component.less',
  animations: [horizontalInOutReverse],
})
export class NotificationListOverlayComponent {
  events = input<ExtremeOcc.Event[]>([]);
  visible = input(false);
  onClose = output<void>();
  onLocate = output<ExtremeOcc.Event>();

  activeId = signal<string | null>(null);

  notifications = signal<Extreme.NotificationWithReadState[]>([]);

  constructor(private notificationService: SupervisorNotificationService) {
    effect(() => {
      if (this.visible()) {
        this.notifications.set(this.notificationService.notifications());
      }
    });
    this.notificationService.fetched$.subscribe((data) => {
      this.notifications.set(data);
    });
  }

  async fetchData() {
    this.notificationService.fetchData();
  }
  getPublishTime(no: Extreme.NotificationWithReadState) {
    return dayjs(no.createTime).format('MM/DD HH:mm');
  }
  getLineMark(lineName: string) {
    return getLineMark(lineName);
  }
  onCloseClick() {
    this.onClose.emit();
  }
  onViewDetail(id: string) {
    this.activeId.set(id);
    this.notificationService.read(id);
  }
}
