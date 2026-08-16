import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'supervisor-categorize-repair',
  imports: [],
  templateUrl: './categorize-repair.component.html',
  styleUrl: './categorize-repair.component.less',
})
export class CategorizeRepairComponent {
  events = input<ExtremeOcc.Event[]>([]);

  total = computed(() => {
    return this.events().length;
  });

  categories = computed(() => {
    const evs = this.events().filter((ev) => ev.urgentRepair);
    const total = evs.length;
    // return occEventCategories.map((item) => {
    //   const count = evs.filter((ev) =>
    //     item.contains.includes(ev.eventType),
    //   ).length;
    //   let percentage = 0;
    //   if (count) {
    //     percentage = Math.floor((count / total) * 100);
    //   }
    //   return {
    //     ...item,
    //     count,
    //     percentage,
    //   };
    // });

    const doneCount = evs.filter((ev) => ev.urgentRepairStatus === 2).length;
    const processingCount = evs.filter(
      (ev) => ev.urgentRepairStatus === 1,
    ).length;
    const pendingCount = evs.filter((ev) => ev.urgentRepairStatus === 0).length;

    return [
      {
        label: '未处置',
        count: pendingCount,
        percentage: Math.floor((pendingCount / total) * 100),
      },
      {
        label: '处置中',
        count: processingCount,
        percentage: Math.floor((processingCount / total) * 100),
      },
      {
        label: '已处置',
        count: doneCount,
        percentage: Math.floor((doneCount / total) * 100),
      },
    ];
  });
}
