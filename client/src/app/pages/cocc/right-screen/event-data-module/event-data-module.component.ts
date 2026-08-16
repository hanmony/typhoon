import { Component, computed, signal } from '@angular/core';
import { linesData2026 } from '../../../case-detail/services/meta';
import { occEventTypes } from '../../../occ/occ.const';
import {
  EventCardComponent,
  type CardItem,
} from './../event-card/event-card.component';

const states = ['已处理', '处理中', '待处理', '待验证'];

const getDummyType = () =>
  occEventTypes[Math.floor(Math.random() * occEventTypes.length)];

const getDummyLine = () =>
  linesData2026[Math.floor(Math.random() * linesData2026.length)].name;

const getDummyState = () => states[Math.floor(Math.random() * states.length)];

const getDummyPosition = (lineName: string) => {
  const line = linesData2026.find((l) => l.name === lineName)!;
  const stations = line.points.filter((p) => p.type === 'station');
  return stations[Math.floor(Math.random() * stations.length)];
};

const getDummyCardItem = (): CardItem => {
  const line = getDummyLine();
  const startStation = getDummyPosition(line).name || '';
  const isSingleStation = Math.random() > 0.5;
  const endStation = isSingleStation ? '' : getDummyPosition(line).name || '';

  return {
    type: getDummyType(),
    line,
    startStation,
    endStation: endStation === startStation ? '' : endStation,
    state: getDummyState(),
  };
};
const getCertainDummyCards = (count: number) =>
  Array.from({ length: count }).map((_) => getDummyCardItem());

@Component({
  selector: 'cocc-event-data-module',
  imports: [EventCardComponent],
  templateUrl: './event-data-module.component.html',
  styleUrl: './event-data-module.component.less',
})
export class EventDataModuleComponent {
  allData = signal<CardItem[]>(getCertainDummyCards(30));
  shownData = signal<CardItem[]>([]);
  toBeVerifiedData = computed<CardItem[]>(() => {
    return this.allData().filter((d) => d.state === '待验证');
  });

  tabs = ['全部事件', ...states.filter((s) => s !== '待验证')];
  activeTab = '全部事件';
  onTabItemClick(tab: string) {
    this.activeTab = tab;
    if (tab === '全部事件') {
      this.shownData.set(this.allData().filter((d) => d.state !== '待验证'));
      return;
    }
    this.shownData.set(this.allData().filter((d) => d.state === tab));
  }

  ngOnInit() {
    this.onTabItemClick('全部事件');
  }
}
