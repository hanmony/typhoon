import { Component, Input, SimpleChanges } from '@angular/core';
import { horizontalInOutReverse } from '../../../../common.animation';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { LibraryNzModule } from '../../../../library.nz.module';
import { typhoonTableMeta } from '../../raw-typhoon.table.meta';
import { localEventCategories } from '../../selections.data';
import {
  AutoPlayService,
  AutoPlayState,
} from '../../services/auto-play.service';
import { UtilsService } from '../../services/utils.service';
import { Timing } from '../../timeline/timeline.component';
import { LOCAL_EVENT_KEYS_MAP } from './../../services/utils.service';
import { TyphoonTableData, getTyphoonTableData } from './../../utils';

@Component({
  selector: 'statistical-table-modal',
  imports: [LibraryNzModule],
  animations: [horizontalInOutReverse],
  templateUrl: './statistical-table-modal.component.html',
  styleUrl: './statistical-table-modal.component.less',
})
export class StatisticalTableModalComponent {
  visible = false;
  typhoonTableMeta = typhoonTableMeta;
  currentTableType: 'all' | 'current' = 'all';
  currentCategoryKey: ActionCategory = ActionCategory.opevent;
  currentSubTypeKey: string = '树枝侵限';
  entireTables: TyphoonTableData[] = [];
  currentTimingTables: TyphoonTableData[] = [];
  @Input() allEvents?: ActionDto[];
  @Input() selectedTiming?: Timing;

  autoPlaying = false;
  autoPlayTime = '';

  categories = localEventCategories.slice();

  get currentTimeString() {
    if (!this.selectedTiming && !this.autoPlaying) return '';
    if (this.autoPlaying) {
      return this.autoPlayTime || '';
    } else {
      return this.selectedTiming?.startTime || '';
    }
  }
  constructor(
    private readonly autoPlayService: AutoPlayService,
    private readonly utils: UtilsService,
  ) {
    this.autoPlayService.autoPlayStateChangeSubject$.subscribe((state) => {
      if (state === AutoPlayState.RUNNING) {
        this.autoPlaying = true;
      } else if (state === AutoPlayState.TERMINATED) {
        this.autoPlaying = false;
      }
    });
    this.autoPlayService.autoPlayTaskChangeSubject$.subscribe((task) => {
      if (task) {
        this.autoPlayTime = task.startTime;
      }
    });
  }
  toggleVisible() {
    this.visible = !this.visible;
    if (this.visible) {
      this.setCurrentTimingTables();
    }
  }
  close() {
    this.visible = false;
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['allEvents']) {
      if (this.allEvents) {
        this.entireTables = getTyphoonTableData(this.allEvents);
        this.setCurrentTimingTables();
      }
    }
    if (changes['selectedTiming']) {
      this.setCurrentTimingTables();
    }
  }
  setCurrentTimingTables() {
    let evs: ActionDto[] = [];

    const timestamp = new Date(this.currentTimeString).getTime();
    if (this.autoPlaying) {
      evs = (this.allEvents || []).filter((ev) => {
        return (
          new Date(ev.fromDate).getTime() <= timestamp &&
          new Date(ev.toDate).getTime() > timestamp
        );
      });
    } else {
      if (this.selectedTiming) {
        evs = this.selectedTiming.events.slice();
      }
    }
    this.currentTimingTables = getTyphoonTableData(evs);
  }
  setCurrentTableType(type: 'all' | 'current') {
    this.currentTableType = type;
  }
  onCategoryChange(cate: ActionCategory) {
    this.currentCategoryKey = cate;
    const firstSubTypeKey = this.currentSubTypes[0].value;
    this.currentSubTypeKey =
      this.currentSubTypes.find((item) => item.length)?.value ||
      firstSubTypeKey;
  }
  onSubTypeChange(subType: string) {
    this.currentSubTypeKey = subType;
  }
  getStartTime(row: ActionDto) {
    const t = this.utils.formatTimeString(row.fromDate);
    return t ? t.slice(5) : '';
  }
  getEndTime(row: ActionDto) {
    const t = this.utils.formatTimeString(row.toDate);
    return t ? t.slice(5) : '';
  }
  get currentEntireTableData() {
    if (this.currentTableType === 'current') {
      return this.currentTimingTables.find(
        (table) => table.key === this.currentCategoryKey,
      );
    }
    return this.entireTables.find(
      (table) => table.key === this.currentCategoryKey,
    );
  }
  get currentSubTypes() {
    const categoryDto = this.categories.find(
      (c) => c.key === this.currentCategoryKey,
    );
    if (!categoryDto) return [];
    return categoryDto.items.map((item) => {
      return {
        ...item,
        length: this.getList(item.value).length,
      };
    });
  }
  getList(currentSubTypeKey: string) {
    if (!this.currentEntireTableData) return [];
    const d = this.currentEntireTableData.data;
    const m = LOCAL_EVENT_KEYS_MAP.find(
      (k) => k[1] === this.currentCategoryKey,
    );
    if (!m || m[2] === 'unknown') return d;
    return d.filter((d) => d.items[m[2]] === currentSubTypeKey);
  }
  get finalTableData() {
    return this.getList(this.currentSubTypeKey);
  }
}
