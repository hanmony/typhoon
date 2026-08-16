import { Component, input, output, signal } from '@angular/core';
import { getLineMark, linesData2026 } from '../../case-detail/services/meta';

@Component({
  selector: 'supervisor-line-selection-overlay',
  imports: [],
  templateUrl: './line-selection-overlay.component.html',
  styleUrl: './line-selection-overlay.component.less',
})
export class LineSelectionOverlayComponent {
  isDD = input(false);

  change = output<string[]>();

  lines = signal(
    linesData2026
      .map((l) => ({
        name: l.name,
        checked: true,
      }))
      .map((l) => ({
        ...l,
        marker: getLineMark(l.name),
      })),
  );

  cacheLines = input<string[]>([]); // 上层数据
  // allChecked = computed(() => this.lines().every((l) => l.checked));
  allChecked = signal(true);

  ngOnInit() {
    this.lines.set(
      this.lines().map((l) => ({
        ...l,
        checked: this.cacheLines().includes(l.name),
      })),
    );
    this.updateAllChecked();
  }
  handleAction(line: { name: string; checked: boolean }) {
    this.lines.set(
      this.lines().map((l) => {
        if (l.name === line.name) {
          l.checked = !l.checked;
        }
        return l;
      }),
    );
    this.updateAllChecked();
    this.change.emit(
      this.lines()
        .filter((l) => l.checked)
        .map((l) => l.name),
    );
  }

  handleCheckAll() {
    if (this.lines().some((l) => l.checked)) {
      this.lines().forEach((l) => (l.checked = false));
    } else {
      this.lines().forEach((l) => (l.checked = true));
    }
    this.updateAllChecked();
    this.change.emit(
      this.lines()
        .filter((l) => l.checked)
        .map((l) => l.name),
    );
  }
  updateAllChecked() {
    this.allChecked.set(this.lines().every((l) => l.checked));
  }
}
