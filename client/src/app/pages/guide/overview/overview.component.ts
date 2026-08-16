import { Component, Input, SimpleChanges } from '@angular/core';
import { CaseDto } from '../../../domain/case.dto';

const colors = ['#34B8F2', '#2773D0', '#21F1E1', '#D69813', '#E9BC5C'] as const;

interface Item {
  key: string;
  label: string;
  value?: string | number | Date;
  dot?: string;
}

const effects: Item[] = [
  { key: '影响上海时长', label: '影响时长' },
  { key: '台风最大风力', label: '最大风力' },
  { key: '台风最大预警等级', label: '最高预警' },
];

const measures: Item[] = [
  { key: '共计发布预警指令', label: '发布指令' },
  { key: '停运线路数', label: '停运线路' },
  { key: '影响事件', label: '影响事件' },
  { key: '施工调整', label: '施工调整' },
];

const publicOpinions: Item[] = [
  { key: '热线接听总量', label: '热线接听' },
  { key: '人工接听总量', label: '人工接听' },
  { key: '台风相关咨询建议', label: '咨询建议' },
  { key: '舆情概况', label: '舆情概况' },
];

@Component({
  selector: 'guide-overview',
  imports: [],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.less',
  host: {
    class: 'w-full flex justify-between pt-8',
  },
})
export class OverviewComponent {
  @Input() data?: CaseDto;
  infos = {
    effects,
    measures,
    publicOpinions,
  };
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.resetInfos();
    }
  }
  resetInfos() {
    if (this.data) {
      Object.values(this.infos).forEach((items) => {
        const colorTranscript = colors.slice();
        items.forEach((e) => {
          const dto = this.data!.values[e.key];
          e.value = dto?.value || '-';
          e.dot = colorTranscript.splice(
            Math.floor(Math.random() * colorTranscript.length),
            1,
          )[0];
        });
      });
    }
  }
}
