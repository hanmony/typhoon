import { Component, computed, input, output } from '@angular/core';
import { repairStateTextMap } from '../../../occ/occ.const';
import { FunctionOverlaySelectComponent } from './select/select.component';

@Component({
  selector: 'dc-function-overlay',
  imports: [FunctionOverlaySelectComponent],
  templateUrl: './function-overlay.component.html',
  styleUrl: './function-overlay.component.less',
})
export class DispatchCenterFunctionOverlayComponent {
  // typhoonLineVisible = input(true);
  // typhoonCircleVisible = input(true);
  // stationsNameVisible = input(false);

  // setTyphoonLineVisible = output<boolean>();
  // setTyphoonCircleVisible = output<boolean>();
  // setStationsNameVisible = output<boolean>();

  allLines = input<string[]>([]);
  allLineOptions = computed(() =>
    this.allLines().map((l) => ({ label: l, value: l })),
  );
  currentSelectedLines = input<string[]>([]);
  onLineChange = output<any>();

  selectLinesChangeHandler(lines: string | string[]) {
    this.onLineChange.emit(lines as string[]);
  }

  allRepairStates = [
    { value: -1, label: '所有事件' },
    ...Object.entries(repairStateTextMap).map(([value, label]) => ({
      value: Number(value),
      label,
    })),
  ];
  currentSelectedRepairState = input<number>(-1);
  onRepairStateChange = output<number>();

  repairStateChangeHandler(state: number) {
    this.onRepairStateChange.emit(state);
  }
}
