import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ActionCategory } from '../../../domain/action.category';
import { ActionDto } from '../../../domain/action.dto';
import { CaseDto } from '../../../domain/case.dto';
import { ITyphoonData } from '../services/meta';
import { UtilsService, keyToCategory } from '../services/utils.service';
import { Timing } from '../timeline/timeline.component';
import { CommonEventModalComponent } from './common-event-modal/common-event-modal.component';
import { IllustrationModalComponent } from './illustration-modal/illustration-modal.component';
import { PublicOpinionInformationComponent } from './public-opinion-information/public-opinion-information.component';
import { StatisticalTableModalComponent } from './statistical-table-modal/statistical-table-modal.component';
import { TyphoonDetailModalComponent } from './typhoon-detail-modal/typhoon-detail-modal.component';

const commonTools = [
  { name: '台风详情', image: 'assets/images/map/dock/typhoon-detail.png' },
  { name: '舆情信息', image: 'assets/images/map/dock/statistics-icon.png' },
  { name: '图例说明', image: 'assets/images/map/dock/illustration-icon.png' },
  {
    name: '事件统计',
    image: 'assets/images/map/dock/statistical-table-icon.png',
  },
  {
    name: '案例总结',
    image: 'assets/images/map/dock/case-summary.png',
  },
];

const eventTools = [
  {
    name: '运营事件',
    image: 'assets/images/map/dock/operational-events.png',
  },
  { name: '行车措施', image: 'assets/images/map/dock/driving-measures.png' },
  {
    name: '客运措施',
    image: 'assets/images/map/dock/passenger-transport-measures.png',
  },
  {
    name: '客运处置',
    image: 'assets/images/map/dock/passenger-disposal.png',
  },
  {
    name: '施工调整',
    image: 'assets/images/map/dock/construction-adjustments.png',
  },
];

@Component({
  selector: 'case-detail-dock',
  imports: [
    TyphoonDetailModalComponent,
    CommonEventModalComponent,
    IllustrationModalComponent,
    StatisticalTableModalComponent,
    PublicOpinionInformationComponent,
  ],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.less',
})
export class DockComponent {
  visibleTools: { name: string; image: string; disabled?: boolean }[] =
    commonTools;
  @Input() typhoonMeta?: ITyphoonData;
  @Input() data?: CaseDto;
  @Input() allEvents?: ActionDto[];
  @Input() selectedTiming?: Timing;
  @Input() currentTimeString?: string;
  @Output() visibleChange = new EventEmitter<string[]>();

  @ViewChild(TyphoonDetailModalComponent)
  typhoonDetailModal?: TyphoonDetailModalComponent;

  @ViewChild(CommonEventModalComponent)
  commonEventModal?: CommonEventModalComponent;

  @ViewChild(IllustrationModalComponent)
  illustrationModal?: IllustrationModalComponent;

  @ViewChild(StatisticalTableModalComponent)
  statisticalTableModalComponent?: StatisticalTableModalComponent;

  @ViewChild(PublicOpinionInformationComponent)
  publicOpinionInformationComponent?: PublicOpinionInformationComponent;

  constructor(
    private readonly router: Router,
    private readonly utils: UtilsService,
  ) {}
  backToHome() {
    this.router.navigate(['/typhoon-library']);
  }
  onToolClick(tool: { name: string; image: string }) {
    switch (tool.name) {
      case '台风详情': {
        this.typhoonDetailModal?.toggleVisible();
        break;
      }
      case '事件统计': {
        this.statisticalTableModalComponent?.toggleVisible();
        break;
      }
      case '舆情信息': {
        this.publicOpinionInformationComponent?.toggleVisible();
        break;
      }
      case '案例总结': {
        window.open('/document;id=' + this.data?._id);
        break;
      }
      case '图例说明': {
        this.illustrationModal?.toggleVisible();
        break;
      }
      case '施工调整': {
        const target = this.visibleTools.find((e) => e.name === tool.name);
        if (target) {
          target.disabled = !target.disabled;
          this.commonEventModal?.setConstructionVisible(!target.disabled);
        }
        break;
      }
      default: {
        const target = this.visibleTools.find((e) => e.name === tool.name);
        if (target) {
          target.disabled = !target.disabled;
          const disableList = this.visibleTools
            .filter((t) => t.disabled === true)
            .map((t) => t.name);
          this.visibleChange.emit(disableList);
        }
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedTiming']) {
      this.resetToolsVisibility();
    }
  }
  resetToolsVisibility() {
    if (!this.selectedTiming) {
      this.visibleTools = commonTools;
    } else {
      const evs = this.selectedTiming.events;
      const map = this.utils.separateEventsByCategory(evs);
      this.visibleTools = [
        ...commonTools,
        ...eventTools
          .filter((e) => map.get(keyToCategory[e.name]))
          .map((t) => ({
            ...t,
            disabled: t.name === '施工调整' ? false : false,
          })),
      ];
      if (this.visibleTools.find((e) => e.name === '施工调整')) {
        this.commonEventModal?.open(ActionCategory.construction, evs);
      } else {
        this.commonEventModal?.close();
      }
    }
  }
  openModal(cate: ActionCategory, evs: ActionDto[]) {
    this.commonEventModal?.open(cate, evs);
  }
}
