import { Component, ElementRef, signal } from '@angular/core';
import { linesData2026 } from './../../../case-detail/services/meta';
import { ModuleHeaderComponent } from './../../../dispatch-center/module-header/module-header.component';

const getRandomAbnormalState = () => {
  return ['停运', '提前巡道', '限速'][Math.floor(Math.random() * 3)];
};

const getRandomPosition = (lineName: string) => {
  const line = linesData2026.find((l) => l.name === lineName)!;
  const stations = line.points.filter((p) => p.type === 'station');
  return stations[Math.floor(Math.random() * stations.length)];
};

const getAbnormalItem = (l: string) => {
  return {
    startStation: getRandomPosition(l),
    endStation: getRandomPosition(l),
    state: getRandomAbnormalState(),
  };
};

@Component({
  selector: 'cocc-line-op-module',
  imports: [ModuleHeaderComponent],
  templateUrl: './line-op-module.component.html',
  styleUrl: './line-op-module.component.less',
})
export class LineOpModuleComponent {
  height = signal(300);
  constructor(private elementRef: ElementRef<HTMLDivElement>) {}

  lineStateData = linesData2026.map((l) => {
    const isNormal = Math.random() > 0.75;
    return {
      name: l.name,
      isNormal,
      abnormalList: isNormal
        ? []
        : Array.from({ length: Math.floor(Math.random() * 10) || 3 }).map((_) =>
            getAbnormalItem(l.name),
          ),
    };
  });

  ngAfterViewInit() {
    const dom = this.elementRef.nativeElement;
    const top = dom.offsetTop;
    setTimeout(() => {
      this.height.set(dom.parentElement!.offsetHeight - top - 16);
    });
  }

  get normalLineStateData() {
    return this.lineStateData.filter((d) => d.isNormal);
  }
  get abnormalLineStateData() {
    return this.lineStateData.filter((d) => !d.isNormal);
  }
}
