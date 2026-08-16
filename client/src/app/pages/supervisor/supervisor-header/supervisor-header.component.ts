import { Component, computed, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import dayjs from 'dayjs';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { interval, map } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { SettingService } from '../../../services/setting.service';
import { StorageService } from '../../../services/storage.service';
import { OccTyphoonService } from '../../occ/map/typhoon.occ.service';
import { SupervisorNotificationService } from '../notification.supervisor.service';
import { WeatherDataComponent } from './weather-data/weather-data.component';

@Component({
  selector: 'supervisor-header',
  imports: [WeatherDataComponent, NzBadgeModule],
  templateUrl: './supervisor-header.component.html',
  styleUrl: './supervisor-header.component.less',
})
export class SupervisorHeaderComponent {
  toggleNotificationListOverlay = output();
  currentTime = toSignal(
    interval(1000).pipe(
      map(() => {
        if (this.occTyphoonService.isSimulation) {
          return this.occTyphoonService.simulateCurrentTime.toDate();
        } else {
          return new Date();
        }
      }),
    ),
  );

  timeText = computed(() => {
    const d = dayjs(this.currentTime());
    // 2024年12月18日 11:04:44
    return d.format('HH:mm:ss');
  });
  dateText = computed(() => {
    const d = dayjs(this.currentTime());
    // 2024年12月18日 11:04:44
    return d.format('YYYY MM DD');
  });

  unreadCount = signal(0);

  constructor(
    public readonly settings: SettingService,
    private readonly storage: StorageService,
    private readonly api: ApiService,
    private readonly router: Router,
    private occTyphoonService: OccTyphoonService,
    private notificationService: SupervisorNotificationService,
  ) {
    this.notificationService.fetched$.subscribe((data) => {
      this.unreadCount.set(data.filter((d) => !d.isRead).length);
    });
  }

  fullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }
  handleLogout() {
    // this.loading = true;
    this.api.auth.logout().then(() => {
      this.settings.clear();
      this.storage.token = '';
      this.router.navigate(['/login'], {
        queryParams: { from: location.pathname },
      });
    });
    // .finally(() => (this.loading = false));
  }

  handleMessageBtnClick() {
    this.toggleNotificationListOverlay.emit();
  }
}
