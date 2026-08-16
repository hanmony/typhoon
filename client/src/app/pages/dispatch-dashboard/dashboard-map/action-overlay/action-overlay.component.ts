import { Component, computed, input, output, signal } from '@angular/core';
import { verticalInOut } from '../../../../common.animation';
import { LibraryNzModule } from '../../../../library.nz.module';
import { linesData2026 } from '../../../case-detail/services/meta';
import { occEventCategories } from '../../../occ/occ.const';
import { LineSelectionOverlayComponent } from '../../../supervisor/line-selection-overlay/line-selection-overlay.component';

export interface DashboardFilterState {
  type: 'event' | 'operation';
  event: {
    type: string;
    level: string;
  };
  operation: {
    type: string;
  };
  line: string[];
}

interface ButtonProps {
  name: string;
  belongs: string;
  key: string;
  value: string;
  options: Option[];
}

export const getInitialDashboardState = (): DashboardFilterState => ({
  type: 'event',
  event: {
    type: 'all',
    level: 'all',
  },
  operation: {
    type: 'all',
  },
  line: linesData2026.map((l) => l.name),
});

@Component({
  selector: 'dd-action-overlay',
  imports: [LibraryNzModule, LineSelectionOverlayComponent],
  templateUrl: './action-overlay.component.html',
  styleUrl: './action-overlay.component.less',
  animations: [verticalInOut],
})
export class ActionOverlayComponent {
  currentType = input<string>('event');
  onStateChange = output<DashboardFilterState>();
  isHide = signal<boolean>(false);
  lineSelectOverlayVisible = signal<boolean>(false);
  cacheLines = signal<string[]>(linesData2026.map((l) => l.name));
  actions = signal<ButtonProps[]>([
    {
      name: '事件类型',
      key: 'type',
      belongs: 'event',
      value: 'all',
      options: [
        { label: '全部', value: 'all' },
        ...occEventCategories.map((item) => ({
          label: item.label,
          value: item.label,
        })),
      ],
    },
    {
      name: '事件级别',
      key: 'level',
      belongs: 'event',
      value: 'all',
      options: [
        { label: '全部', value: 'all' },
        { label: '普通事件', value: 'normal' },
        { label: '重点事件', value: 'severity' },
        { label: '督办事件', value: 'supervision' },
      ],
    },
    {
      name: '运营类型',
      key: 'type',
      belongs: 'operation',
      value: 'all',
      options: [
        { label: '全部', value: 'all' },
        { label: '停运', value: '停运' },
        { label: '限速', value: '限速' },
        { label: '间隔调整', value: '间隔调整' },
      ],
    },
  ]);
  shownActions = computed(() => {
    return this.actions().filter((item) => {
      return item.belongs === this.currentType();
    });
  });

  activeAction = signal<string | null>(null);

  onVisibleChange(data: ButtonProps, visible: boolean) {
    if (visible) {
      this.activeAction.set(data.key);
    } else {
      this.activeAction.set(null);
    }
  }
  getFilterState() {
    const state: DashboardFilterState = getInitialDashboardState();
    state.type = this.currentType() as DashboardFilterState['type'];
    this.actions().forEach((item) => {
      if (item.belongs === 'event') {
        state.event[item.key as 'type' | 'level'] = item.value;
      }
      if (item.belongs === 'operation') {
        state.operation[item.key as 'type'] = item.value;
      }
    });
    state.line = this.cacheLines().slice();
    return state;
  }

  onLineButtonClick() {
    const prevVisible = this.lineSelectOverlayVisible();
    this.lineSelectOverlayVisible.set(!prevVisible);
    this.activeAction.set(prevVisible ? null : 'line-filter');
  }
  closeLineSelectOverlay() {
    this.lineSelectOverlayVisible.set(false);
    this.activeAction.set(null);
  }

  onLineChange(lines: string[]) {
    this.cacheLines.set(lines);
    // this.lineSelectOverlayVisible.set(false);
    this.onStateChange.emit(this.getFilterState());
  }

  handleSelect(p: ButtonProps, value: string) {
    const prev = this.actions();
    const current = prev.map((item) => {
      if (item.key === p.key) {
        return { ...item, value };
      }
      return item;
    });
    this.actions.set(current);
    this.onStateChange.emit(this.getFilterState());
  }

  getButtonText(p: ButtonProps) {
    if (p.value === 'all') return p.name;
    return p.options.find((op) => op.value === p.value)?.label || '';
  }

  followUpStream(state: DashboardFilterState) {
    const { type: eventType, level: eventLevel } = state.event;
    const { type: operationType } = state.operation;
    const { line } = state;

    this.actions.set(
      this.actions().map((item) => {
        if (item.belongs === 'event') {
          return {
            ...item,
            value: item.key === 'type' ? eventType : eventLevel,
          };
        }
        if (item.belongs === 'operation') {
          return { ...item, value: operationType };
        }
        return item;
      }),
    );
    this.cacheLines.set(line);
  }

  hidePopups() {
    this.activeAction.set(null);
    this.lineSelectOverlayVisible.set(false);
  }
}
