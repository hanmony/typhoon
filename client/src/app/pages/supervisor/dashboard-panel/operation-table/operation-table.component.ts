import {
  Component,
  effect,
  ElementRef,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import { interval, Subscription } from 'rxjs';
import { LibraryNzModule } from '../../../../library.nz.module';
import { ApiService } from '../../../../services/api.service';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import { PatrollingDiagramService } from '../../../../shared/patrolling/patrolling.diagram.service';
import PatrollingTour from '../../../../shared/patrolling/patrolling.tour.class';
import { getPositionTextFromDto } from '../../../../shared/shared.event.effect';
import { getLineMark, lineNames } from '../../../case-detail/services/meta';
import { StateTagComponent } from '../../../dispatch-dashboard/dashboard-panel/event-table/state-tag/state-tag.component';
import {
  Collection,
  LineCollection,
} from '../../../dispatch-dashboard/dashboard-panel/operation-table/operation-table.component';

@Component({
  selector: 'supervisor-operation-table',
  imports: [LibraryNzModule, StateTagComponent],
  templateUrl: './operation-table.component.html',
  styleUrl: './operation-table.component.less',
})
export class SupervisorOperationTableComponent extends AutoScrollComponent<HTMLTableSectionElement> {
  @ViewChild('tbodyRef')
  override scrollContainer!: ElementRef<HTMLTableSectionElement>;
  paginationConfig = input.required<{
    autoTurn: boolean;
  }>();
  operations = input<ExtremeOcc.Operation[]>([]);

  orderConfig = signal({
    prop: 'index',
    asc: false,
  });

  detailTextFormState = signal({
    editing: false,
    key: '',
    value: '',
  });

  detailObstructingFormState = signal({
    editing: false,
    key: '',
    value: 0,
  });

  isFetchingDetail = signal(false);

  intervalUpdateData$ = interval(10000);
  intervalUpdateDataSubscription?: Subscription;

  intervalFetchData$ = interval(30000);
  intervalFetchDataSubscription?: Subscription;

  patrollingData = lineNames.map((l) => {
    return {
      name: l,
      patrolling: false,
      finished: false,
      expiration: 0,
      endTime: Date.now(),
      currentCount: 0,
    };
  });
  opDetailData: ExtremeOcc.OpDetail[] = [];

  dataSet = signal<LineCollection[]>(
    lineNames.map((l) => ({ line: l, collections: [], total: 0 })),
  );
  constructor(
    private api: ApiService,
    private patrollingService: PatrollingDiagramService,
  ) {
    super();
    effect(() => {
      this.setDataSet();
      this.setFixHeight();
      this.setScrollHeight();
    });
  }

  ngOnInit() {
    this.fetchData();
  }

  override ngAfterViewInit() {
    this.intervalFetchDataSubscription = this.intervalUpdateData$.subscribe(
      this.fetchData.bind(this),
    );
    this.intervalUpdateDataSubscription = this.intervalUpdateData$.subscribe(
      this.updatePatrollingData.bind(this),
    );
    if (this.paginationConfig().autoTurn) {
      // 不自动滚动，手动点击‘自动翻页’功能按钮时，再开启自动滚动
      this.setAutoScrollEnabled(true);
    }
  }

  fetchData() {
    this.fetchTours();
    this.fetchOpDetails();
  }

  async fetchOpDetails() {
    this.isFetchingDetail.set(true);
    try {
      const data = await this.api.extreme.getOpDetailList();
      this.isFetchingDetail.set(false);
      this.opDetailData = data;
      this.dataSet.update((prev) => {
        return prev.map((l) => {
          const detailInfo = data.find((d) => d.line === l.line);
          return {
            ...l,
            detailInfo,
          };
        });
      });
    } catch (err) {
      this.isFetchingDetail.set(false);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.intervalUpdateDataSubscription?.unsubscribe();
    this.intervalFetchDataSubscription?.unsubscribe();
  }

  async fetchTours() {
    const tours = await this.api.patrolling.getTourList();
    this.resetDataByTours(tours);
  }
  resetDataByTours(tours: PatrollingType.TourDto[]) {
    const lineMap = new Map<string, PatrollingType.TourDto[]>();
    tours.forEach((t) => {
      if (lineMap.get(t.line)) {
        lineMap.get(t.line)?.push(t);
      } else {
        lineMap.set(t.line, [t]);
      }
    });

    this.patrollingData.forEach((line) => {
      const lineMeta = this.patrollingService.getLineMeta(line.name);
      if (!lineMeta || !lineMap.get(line.name)) {
        line.patrolling = false;
        line.finished = true;
        line.expiration = 0;
      } else {
        const currentLineTours = lineMap.get(line.name) || [];
        const currentLineTourInstances = currentLineTours.map(
          (t) =>
            new PatrollingTour({
              isTemporary: true,
              meta: {
                line: t.line,
                identifiers: t.identifiers,
                startTime: new Date(t.startTime),
                speed: t.speed,
                id: t.id,
                serialNumber: t.serialNumber,
                createTime: new Date(t.createTime),
              },
              lineMeta: lineMeta,
            }),
        );
        const maxEndDate = Math.max(
          ...currentLineTourInstances.map((t) => t.endDate.getTime()),
        );
        line.patrolling = true;
        line.finished = false;
        line.endTime = maxEndDate;
        line.currentCount = currentLineTours.length;
      }
    });

    this.updatePatrollingData();
  }

  updatePatrollingData() {
    this.patrollingData.forEach((line) => {
      if (!line.patrolling) return;
      const { endTime } = line;
      const now = Date.now();
      const last = Math.floor(endTime - now);
      line.expiration = last > 0 ? last : 0;
      if (line.expiration === 0) {
        line.finished = true;
      }
    });
  }

  setDataSet() {
    const ops = this.operations();
    const sameKeyMap = new Map<string, Collection>();
    ops.forEach((op) => {
      const key = this.getOperationKey(op);
      const curMap = sameKeyMap.get(key);
      if (curMap) {
        curMap.operations.push(op);
      } else {
        sameKeyMap.set(key, {
          key,
          state: this.getStateText(op),
          stateColor: this.getStateColor(op),
          startTime: op.startTime,
          actualEndTime: op.actualEndTime,
          operations: [op],
        });
      }
    });
    const result = lineNames.map((l) => {
      return {
        line: l,
        total: 0,
        collections: Array.from(sameKeyMap.values()).filter((c) =>
          c.operations.some((op) => op.line === l),
        ),
        patrollingInfo: this.patrollingData.find((p) => p.name === l),
        detailInfo: this.opDetailData.find((d) => d.line === l),
      };
    });
    result.forEach((l) => {
      l.total = l.collections.reduce((acc, c) => acc + c.operations.length, 0);
    });
    this.dataSet.set(result);
  }

  handleOrdering(prop: string) {}

  getLineMark(line: string) {
    return getLineMark(line);
  }

  getStateText(op: ExtremeOcc.Operation) {
    const now = Date.now();
    if (new Date(op.startTime).getTime() > now) {
      return '未开始';
    }
    if (op.actualEndTime) {
      if (new Date(op.actualEndTime).getTime() < now) {
        return '已结束'; // ! 该状态的的运营数据已在上游组件过滤掉
      }
    }
    return '进行中';
  }

  getStateColor(op: ExtremeOcc.Operation) {
    const text = this.getStateText(op);
    if (text === '进行中') {
      return '#FFA11B';
    }
    return '#A5B2C8';
  }

  getCollectionStateText(collection: Collection) {
    return collection.state;
  }

  getPositionText(op: ExtremeOcc.Operation) {
    return getPositionTextFromDto(op);
  }

  getTimeText(time: string) {
    if (!time) return '';
    return dayjs(time).format('MM/DD HH:mm');
  }
  getOperationKey(op: ExtremeOcc.Operation) {
    if (op.actionType !== '站点关闭') {
      return `${op.line}-${op.actionType}-${op.close}-${this.getTimeText(op.startTime)}`;
    }
    return `${op.line}-${op.actionType}-${this.getTimeText(op.startTime)}`;
  }

  getOperationDetailText(lineVO: LineCollection) {
    const detailText = lineVO.detailInfo?.detail;
    return detailText;
  }
  getObstructText(lineVO: LineCollection) {
    return lineVO.detailInfo?.isObstructing === 1 ? '是' : '';
  }

  formatExpirationInMinutes(ms: number) {
    const minutes = Math.ceil(ms / 60 / 1000);
    return `${minutes}min`;
  }
}
