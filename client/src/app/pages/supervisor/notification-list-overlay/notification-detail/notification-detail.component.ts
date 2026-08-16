import { Component } from '@angular/core';
import { LibraryNzModule } from '../../../../library.nz.module';
import { NotificationDetailComponent } from '../../../cocc/left-screen/notification-list-overlay/notification-detail/notification-detail.component';

@Component({
  selector: 'supervisor-notification-detail',
  imports: [LibraryNzModule],
  templateUrl: './notification-detail.component.html',
  styleUrl: './notification-detail.component.less',
})
export class SupervisorNotificationDetailComponent extends NotificationDetailComponent {}
