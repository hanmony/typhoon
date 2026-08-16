import { Component, output, signal } from '@angular/core';
import { occEventCategories } from '../../occ/occ.const';

const ICON_PREFIX = 'assets/images/supervisor/';

@Component({
  selector: 'supervisor-filter-action',
  imports: [],
  templateUrl: './supervisor-filter-action.component.html',
  styleUrl: './supervisor-filter-action.component.less',
})
export class SupervisorFilterActionComponent {
  onOperationTypeFilterValueChange = output<string | number>();
  onEventDelayFilterValueChange = output<string | number>();
  onEvenRepairStateFilterValueChange = output<string | number>();

  openedCategory = signal<string | null>('line');
  activeLineOptionKey = signal<string | number>('all');
  activeEventOptionKey = signal<string | number>('all');
  activeStateOptionKey = signal<string | number>('all');

  categoryOptions = [
    {
      key: 'line',
      label: '线路情况',
      originLabel: '线路情况',
      icon: ICON_PREFIX + 'filter-train.png',
      iconSize: '1.2rem',
      children: [
        { key: 'all', label: '全部' },
        { key: '停运', label: '停运' },
        { key: '限速', label: '限速' },
        { key: '间隔调整', label: '间隔调整' },
      ],
    },
    {
      key: 'event',
      label: '事件情况',
      originLabel: '事件情况',
      icon: ICON_PREFIX + 'filter-tower.png',
      iconSize: '1.4rem',
      children: [
        { key: 'all', label: '所有事件' },

        ...occEventCategories.map((item) => ({
          key: item.label,
          label: item.label,
        })),
      ],
    },
    {
      key: 'state',
      label: '抢修状态',
      originLabel: '抢修状态',
      icon: ICON_PREFIX + 'filter-tool.png',
      iconSize: '1.5rem',
      children: [
        { key: 'all', label: '全部' },
        { key: 0, label: '未处置' },
        { key: 1, label: '抢修中' },
        { key: 2, label: '已结束' },
      ],
    },
  ];
  isSubOptionActive(category: string, key: string | number) {
    switch (category) {
      case 'line':
        return this.activeLineOptionKey() === key;
      case 'event':
        return this.activeEventOptionKey() === key;
      case 'state':
        return this.activeStateOptionKey() === key;
      default:
        return false;
    }
  }
  onCategoryClick(key: string) {
    const currentKey = this.openedCategory();
    if (currentKey === key) {
      this.openedCategory.set(null);
    } else {
      this.openedCategory.set(key);
    }
  }
  onSubOptionClick(key: string | number) {
    switch (this.openedCategory()) {
      case 'line':
        this.onLineOptionChange(key);
        break;
      case 'event':
        this.onEventOptionChange(key);
        break;
      case 'state':
        this.onStateOptionChange(key);
        break;
      default:
        break;
    }
    this.updateCategoryLabel();
  }
  onLineOptionChange(key: string | number) {
    this.activeLineOptionKey.set(key);
    this.onOperationTypeFilterValueChange.emit(key);
  }
  onEventOptionChange(key: string | number) {
    this.activeEventOptionKey.set(key);
    this.onEventDelayFilterValueChange.emit(key);
  }
  onStateOptionChange(key: string | number) {
    this.activeStateOptionKey.set(key);
    this.onEvenRepairStateFilterValueChange.emit(key);
  }

  updateCategoryLabel() {
    this.categoryOptions.forEach((category) => {
      let key: string | number = '';
      switch (category.key) {
        case 'line':
          key = this.activeLineOptionKey();
          break;
        case 'event':
          key = this.activeEventOptionKey();
          break;
        case 'state':
          key = this.activeStateOptionKey();
          break;
        default:
          break;
      }
      // if (!key) return;
      category.label =
        key === 'all'
          ? category.originLabel
          : category.children.find((op) => op.key === key)!.label;
    });
  }
}
