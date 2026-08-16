import { Component, computed, input } from '@angular/core';
import { horizontalInOutReverse } from '../../../common.animation';
import { eventOnMapVisibilityFilter } from '../occ.const';

@Component({
  selector: 'occ-notification-overlay',
  imports: [],
  templateUrl: './notification-overlay.component.html',
  styleUrl: './notification-overlay.component.less',
  animations: [horizontalInOutReverse],
})
export class OccNotificationOverlayComponent {
  currentLine = input('');
  isHide = input<boolean>(false);
  eventStatistics = input<ExtremeOcc.EventInfo | undefined>(undefined);

  state = computed(() => {});

  total = computed(() => {
    return (
      this.eventStatistics()?.list?.filter(eventOnMapVisibilityFilter).length ??
      0
    );
  });
}
