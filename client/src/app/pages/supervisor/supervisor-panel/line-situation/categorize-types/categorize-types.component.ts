import { Component, computed, input } from '@angular/core';
import { occEventCategories } from '../../../../occ/occ.const';

@Component({
  selector: 'supervisor-categorize-types',
  imports: [],
  templateUrl: './categorize-types.component.html',
  styleUrl: './categorize-types.component.less',
})
export class CategorizeTypesComponent {
  events = input<ExtremeOcc.Event[]>([]);

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
}
