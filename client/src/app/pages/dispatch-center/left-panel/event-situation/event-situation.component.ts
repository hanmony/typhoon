import { Component, computed, input, output } from '@angular/core';
import {
  DashboardFilterState,
  getInitialDashboardState,
} from '../../../dispatch-dashboard/dashboard-map/action-overlay/action-overlay.component';
import { occEventCategories } from '../../../occ/occ.const';
import { ModuleHeaderComponent } from './../../module-header/module-header.component';

@Component({
  selector: 'event-situation-module',
  imports: [ModuleHeaderComponent],
  templateUrl: './event-situation.component.html',
  styleUrl: './event-situation.component.less',
})
export class EventSituationComponent {
  events = input<ExtremeOcc.Event[]>([]);

  toDashboardWithState = output<DashboardFilterState>();

  total = computed(() => {
    return this.events().length;
  });

  categories = computed(() => {
    const evs = this.events();
    const total = evs.length;
    return occEventCategories.map((item) => {
      const count = evs.filter((ev) =>
        item.contains.includes(ev.eventType),
      ).length;
      let percentage = 0;
      if (count) {
        percentage = Math.floor((count / total) * 100);
      }
      return {
        ...item,
        count,
        percentage,
      };
    });
  });

  toDashboard() {
    const state = getInitialDashboardState();
    this.toDashboardWithState.emit({
      ...state,
      type: 'event',
    });
  }

  toDashboardWithCategory(category: string) {
    const state = getInitialDashboardState();
    this.toDashboardWithState.emit({
      ...state,
      type: 'event',
      event: {
        ...state.event,
        type: category,
      },
    });
  }
}
