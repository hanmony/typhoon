import { Component, computed, input } from '@angular/core';
import { getPositionTextFromDto } from '../../../../../shared/shared.event.effect';
import { operationOnMapVisibilityFilter } from '../../../../occ/occ.const';

@Component({
  selector: 'cocc-line-operation-module',
  imports: [],
  templateUrl: './line-operation-module.component.html',
  styleUrl: './line-operation-module.component.less',
})
export class CoccLineOperationModuleComponent {
  lines = input<string[]>([]);
  operations = input<ExtremeOcc.Operation[]>([]);

  inDurationOps = computed(() => {
    return this.operations().filter(operationOnMapVisibilityFilter);
  });

  lineStateData = computed(() => {
    const ops = this.inDurationOps();
    const lines = this.lines();
    return lines.map((l) => {
      const relatedOps = ops.filter((op) => op.line === l);
      const isNormal = relatedOps.length === 0;
      return {
        name: l,
        isNormal,
        abnormalList: isNormal
          ? []
          : relatedOps.map((e) => ({
              state: e.actionType,
              position: getPositionTextFromDto(e),
            })),
      };
    });
  });

  ngAfterViewInit() {}

  normalLineStateData = computed(() => {
    return this.lineStateData().filter((d) => d.isNormal);
  });
  abnormalLineStateData = computed(() => {
    return this.lineStateData().filter((d) => !d.isNormal);
  });
}
