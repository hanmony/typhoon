import { Component, computed, input } from '@angular/core';
import dayjs from 'dayjs';
import { PatrollingStatistic } from '../line-list/line-list.component';

@Component({
  selector: 'patrolling-line-card',
  imports: [],
  templateUrl: './line-card.component.html',
  styleUrl: './line-card.component.less',
})
export class PatrollingLineCardComponent {
  isSupervisor = input(false);
  // primaryColor = input('#399cd8');
  // secondaryColor = input('#399cd860');
  // name = input('');
  data = input<PatrollingStatistic>({
    name: '',
    primaryColor: '#399cd8',
    secondaryColor: '#399cd860',
    patrolling: false,
    expiration: 0,
    finished: false,
    endTime: 0,
  });

  endTime = computed(() => {
    const { endTime } = this.data();
    return dayjs(endTime).format('MM-DD HH:mm');
  });

  formatExpiration(ms: number) {
    // t (ms)
    const hours = Math.floor(ms / 3600 / 1000);
    const minutes = Math.floor((ms % (3600 * 1000)) / 60 / 1000);
    const second = Math.floor((ms % (60 * 1000)) / 1000);
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSecond = String(second).padStart(2, '0');
    if (hours > 0) {
      return `${formattedHours}:${formattedMinutes}:${formattedSecond}`;
    }
    return `${formattedMinutes}:${formattedSecond}`;
  }
}
