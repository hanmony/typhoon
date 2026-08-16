import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import dayjs from 'dayjs';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { z } from 'zod';
import { linesData2026 } from '../../case-detail/services/meta';
import {
  getDirectionOptions,
  getOperationSubActionByKey,
  operationSubActions,
} from '../occ.const';
import { OccEventType } from '../occ.event-bus.model';
import { OccEventBusService } from '../occ.event-bus.service';
import { ApiService } from './../../../services/api.service';
import { OccMapLocateService } from './../map/locate.occ.service';
import { OccErrorTipComponent } from './../widget/error-tip/error-tip.component';
import { OccModalSelectComponent } from './../widget/select/select.component';
import { OccModalTextareaComponent } from './../widget/textarea/textarea.component';

const initialValues: {
  line: string;
  actionType: string;
  locationType: string;
  startStation: string;
  endStation: string;
  customPosition: string;
  direction: string;
  description: string;
  time: Date[];
  startTime?: Date;
  endTime?: Date;
  close: number;
  distance: number;
  limit: number;
  isEndTimeOptional: boolean;
} = {
  line: '',
  actionType: '',
  locationType: '区间',
  startStation: '',
  endStation: '',
  customPosition: '',
  direction: '',
  description: '',
  time: [],
  startTime: undefined,
  endTime: undefined,
  close: 1,
  distance: 1,
  limit: 5,
  isEndTimeOptional: false,
};

const EventAddParamsValidator = {
  single: z.object({
    startStation: z.string().nonempty('请选择站点'),
  }),
  intervalStation: z.object({
    startStation: z.string().nonempty('请选择起始站点'),
    endStation: z.string().nonempty('请选择结束站点'),
    direction: z.string().nonempty('请选择上下行'),
  }),
  custom: z.object({ customPosition: z.string().nonempty('请选择位置') }),
  entireTime: z.array(z.date()).length(2, { message: '请填写时间段' }),
  partialTime: z.date({ message: '请填写开始时间' }),
};

@Component({
  selector: 'occ-operation-modal',
  imports: [
    FormsModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzSwitchModule,
    OccModalSelectComponent,
    NzIconModule,
    // OccModalInputComponent,
    OccModalTextareaComponent,
    OccErrorTipComponent,
  ],
  templateUrl: './operation-modal.component.html',
  styleUrl: './operation-modal.component.less',
})
export class OccOperationModalComponent {
  isCocc = input(false);

  action = input<'add' | 'edit'>('add');
  isEditMode = computed(() => this.action() === 'edit');
  data = input<Partial<ExtremeOcc.Operation> | null>(null);
  line = input('');
  composedLine = computed(() => {
    if (this.isCocc()) {
      return this.values().line;
    }
    return this.line();
  });
  subAction = input<string | null>(null);
  subActionText = computed(() => {
    if (this.isCocc()) {
      return this.values().actionType;
    }
    return getOperationSubActionByKey(this.subAction() || '')?.name || '';
  });
  actionTypeOptions = operationSubActions.map((op) => op.name);
  lines = linesData2026.map((l) => l.name);
  stations = computed(() => {
    const targetLine = linesData2026.find(
      (l) => l.name === this.composedLine(),
    );
    const main = targetLine?.points.filter((p) => p.type === 'station') || [];

    const branches = Array.from(targetLine?.branches || [])
      .map(([, points]) => points)
      .flat()
      .filter((p) => p.type === 'station');
    return [...main, ...branches];
  });
  stationOptions = computed(() => this.stations().map((s) => s.name || ''));

  onLocate = output<{ type: number; line: string }>();
  onQuery = output<void>();
  onAdd = output<ExtremeOcc.OperationAddParams>();
  onEdit = output<Partial<ExtremeOcc.Operation>>();

  confirmLocate$ = this.occEventBusService.on(OccEventType.CONFIRM_LOCATE);

  constructor(
    private api: ApiService,
    private occEventBusService: OccEventBusService,
    private occMapLocateService: OccMapLocateService,
  ) {
    this.confirmLocate$.subscribe(() => {
      this.afterConfirmLocate();
    });
    effect(() => {
      this.isEditMode();
      this.resetValues();
    });
  }

  values = signal({ ...initialValues });
  errors = signal({
    location: '',
    time: '',
  });

  resetValues() {
    if (this.action() === 'edit') {
      this.values.update((prev) => ({
        ...prev,
        ...this.data(),
        actionType: this.data()?.actionType || '',
        startTime: dayjs(this.data()?.startTime).toDate(),
        endTime: dayjs(this.data()?.endTime).toDate(),
        time: [
          dayjs(this.data()?.startTime).toDate(),
          dayjs(this.data()?.endTime).toDate(),
        ],
      }));
    } else {
      this.resetLocationType();
    }
  }
  resetLocationType() {
    const partialValues = {
      startStation: '',
      endStation: '',
      customPosition: '',
    };
    if (this.isStop()) {
      this.values.update((state) => ({
        ...state,
        ...partialValues,
        locationType: '全线',
      }));
      return;
    }
    if (this.isOnlyIntervalStation()) {
      this.values.update((state) => ({
        ...state,
        ...partialValues,
        locationType: '区间',
      }));
    } else {
      this.values.update((state) => ({
        ...state,
        ...partialValues,
        locationType: '站点',
      }));
    }
  }

  isOnlyIntervalStation = computed(() =>
    ['间隔调整', '限速'].includes(this.subActionText()),
  );
  locationTypeOptions = computed(() => {
    // const ops: string[] = [];
    if (this.isStop()) {
      return ['全线', '区间'];
    }
    if (this.isOnlyIntervalStation()) {
      return ['区间'];
    }
    return ['站点'];
  });
  showLocationSection = computed(() => {
    if (this.isStop() && this.values().locationType === '全线') {
      return false;
    }
    return true;
  });
  showLocationButton = computed(() => {
    if (this.isEditMode()) return false;
    if (!this.composedLine()) return false;
    if (!this.subActionText()) return false;
    if (this.isStop() && this.values().locationType === '全线') return false;
    return true;
  });

  isSingleStation = computed(() => this.values().locationType === '站点');
  isIntervalStation = computed(() => this.values().locationType === '区间');
  isCustomPosition = computed(() => this.values().locationType === '自定义');
  shouldShowDirection = computed(() => this.isIntervalStation());
  directionOptions = computed(() => getDirectionOptions(this.composedLine()));
  shouldShowReason = computed(() =>
    ['停运', '间隔调整'].includes(this.subActionText()),
  );
  isStop = computed(() => this.subActionText() === '停运');
  isLimit = computed(() => this.subActionText() === '限速');
  isClose = computed(() => this.subActionText() === '站点关闭');
  isDistanceAdjustment = computed(() => this.subActionText() === '间隔调整');

  setLine(line: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      line: line as string,
      startStation: '',
      endStation: '',
      customPosition: '',
    }));
  }
  setActionType(actionType: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      actionType: actionType as string,
    }));
    this.resetLocationType();
  }
  onLocationTypeChange(type: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      locationType: type as string,
      startStation: '',
      endStation: '',
      customPosition: '',
    }));
  }
  setDescription(description: string) {
    this.values.update((prev) => ({ ...prev, description: description }));
  }
  // setTime(time: string) {
  //   this.values.update((prev) => ({ ...prev, time: time }));
  // }
  setClose(close: number) {
    this.values.update((prev) => ({ ...prev, close }));
  }
  onStartStationChange(station: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      startStation: station as string,
    }));
  }
  onEndStationChange(station: string | string[]) {
    this.values.update((prev) => ({ ...prev, endStation: station as string }));
  }
  onLimitChange(limit: number) {
    this.values.update((prev) => ({ ...prev, limit }));
  }

  onDirectionChange(direction: string | string[]) {
    this.values.update((prev) => ({ ...prev, direction: direction as string }));
  }

  handleLimitStep(acc: number) {
    this.values.update((prev) => {
      let current = prev.limit + acc;
      if (current > 120) {
        current = 120;
      }
      if (current < 5) {
        current = 5;
      }
      return { ...prev, limit: current };
    });
  }

  handleLocate() {
    this.onLocationTypeChange(this.values().locationType);
    if (this.isSingleStation()) {
      this.onLocate.emit({ type: 1, line: this.composedLine() });
    } else if (this.isIntervalStation()) {
      this.onLocate.emit({ type: 2, line: this.composedLine() });
    } else if (this.isCustomPosition()) {
      this.onLocate.emit({ type: 3, line: this.composedLine() });
    }
  }

  terminateLocate() {
    this.onLocate.emit({ type: 0, line: this.composedLine() });
  }

  onTimeChange(ts: Date[]) {
    if (ts.length) {
      this.values.update((v) => ({
        ...v,
        startTime: ts[0],
        endTime: ts[1],
      }));
    }
  }

  onStartTimeChange(date: Date) {
    this.values.update((prev) => ({ ...prev, time: [date, date] }));
  }

  afterConfirmLocate() {
    const tempValues = this.occMapLocateService.tempLocationValues();
    this.values.update((prev) => ({
      ...prev,
      startStation: tempValues.startStation,
      endStation: tempValues.endStation,
      customPosition: tempValues.customPosition,
    }));
  }
  queryToConfirm() {
    this.onQuery.emit();
  }
  async onAddOperation() {
    const values = this.values();
    this.onAdd.emit({
      ...values,
      startTime: values.time[0].toISOString(),
      endTime: values.time[1].toISOString(),
      actionType: this.subActionText(),
      line: this.composedLine(),
      source: this.isCocc() ? 'COCC' : 'OCC',
      // actualEndTime: '',
    });
  }

  async onEditOperation() {
    const values = this.values();
    this.onEdit.emit({
      ...this.data(),
      ...values,
      startTime: values.time[0].toISOString(),
      endTime: values.time[1].toISOString(),
      line: this.composedLine(),
    });
  }
  async submit() {
    await this.validate();
    if (this.action() === 'add') {
      await this.onAddOperation();
    } else {
      await this.onEditOperation();
    }
  }

  async validate() {
    await this.validateLocation();
    await this.validateTime();
  }
  validateLocation(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.isSingleStation()) {
          await EventAddParamsValidator.single.parseAsync(this.values());
        } else if (this.isIntervalStation()) {
          await EventAddParamsValidator.intervalStation.parseAsync(
            this.values(),
          );
        } else if (this.isCustomPosition()) {
          await EventAddParamsValidator.custom.parseAsync(this.values());
        }
        this.errors.update((e) => ({ ...e, location: '' }));
        resolve();
      } catch (error: any) {
        this.errors.update((e) => ({
          ...e,
          location: error.errors[0].message,
        }));
        reject();
      }
    });
  }
  validateTime(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const { isEndTimeOptional, startTime, time } = this.values();
      try {
        if (isEndTimeOptional) {
          await EventAddParamsValidator.partialTime.parseAsync(startTime);
        } else {
          await EventAddParamsValidator.entireTime.parseAsync(time);
        }
        this.errors.update((e) => ({ ...e, time: '' }));
        resolve();
      } catch (error: any) {
        this.errors.update((e) => ({
          ...e,
          time: error.errors[0].message,
        }));
        reject();
      }
    });
  }
}
