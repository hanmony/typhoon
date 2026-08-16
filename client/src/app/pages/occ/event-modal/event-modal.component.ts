import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { z } from 'zod';
import { depots, linesData2026 } from '../../case-detail/services/meta';
import {
  effectDurationOptions,
  getDirectionOptions,
  getEffectDurationLabel,
  getEffectDurationValue,
  occEventTypes,
} from '../occ.const';
import { OccEventType } from '../occ.event-bus.model';
import { OccModalInputComponent } from '../widget/input/input.component';
import { OccModalSelectComponent } from '../widget/select/select.component';
import { OccModalTextareaComponent } from '../widget/textarea/textarea.component';
import { ImageUploadGroupComponent } from './../../../common.component/image-upload-group/image-upload-group.component';
import { LibraryNzModule } from './../../../library.nz.module';
import { OccMapLocateService } from './../map/locate.occ.service';
import { OccEventBusService } from './../occ.event-bus.service';
import { OccErrorTipComponent } from './../widget/error-tip/error-tip.component';

const EventAddParamsValidator = {
  single: z.object({
    startStation: z.string().nonempty('请选择站点'),
  }),
  intervalStation: z.object({
    startStation: z.string().nonempty('请选择起始站点'),
    endStation: z.string().nonempty('请选择结束站点'),
    direction: z.string().nonempty('请选择上下行'),
    customPosition: z.string().nonempty('请定位显示位置'),
  }),
  custom: z.object({ customPosition: z.string().nonempty('请选择位置') }),
};

const initialValues = {
  line: '',
  eventType: '树枝侵限',
  otherEvent: '',
  locationType: '站点',
  startStation: '',
  endStation: '',
  customPosition: '',
  direction: '',
  description: '',
  urgentRepair: 0,
  severity: 0,
  startTime: new Date(),
  images: [] as NzUploadFile[],
  effect: 0,
  effectDuration: 0,
  trainNumber: '',
};

@Component({
  selector: 'occ-event-modal',
  imports: [
    OccModalSelectComponent,
    OccModalInputComponent,
    OccModalTextareaComponent,
    ImageUploadGroupComponent,
    OccErrorTipComponent,
    LibraryNzModule,
  ],
  templateUrl: './event-modal.component.html',
  styleUrl: './event-modal.component.less',
})
export class OccEventModalComponent {
  @ViewChild(ImageUploadGroupComponent)
  imageUploadGroup!: ImageUploadGroupComponent;

  isCocc = input(false);

  line = input('');
  composedLine = computed(() => {
    if (this.isCocc()) {
      return this.values().line;
    }
    return this.line();
  });
  action = input<'add' | 'edit'>('add');
  isEditMode = computed(() => this.action() === 'edit');
  effectDurations = effectDurationOptions.map((op) => op.label);
  get effectDurationValue() {
    return getEffectDurationLabel(this.values().effectDuration);
  }
  data = input<Partial<ExtremeOcc.Event> | null>(null);
  // stations = input<{ name?: string }[]>([]);
  // depots = input<{ name?: string }[]>([]);
  onLocate = output<{
    type: number;
    line: string;
    values?: {
      startStation?: string;
      endStation?: string;
    };
  }>();
  onQuery = output<void>();
  onAdd = output<ExtremeOcc.EventAddParams>();
  onEdit = output<Partial<ExtremeOcc.Event>>();
  onClose = output<void>();

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
  depots = computed(() => {
    return depots.filter((d) => d.line === this.composedLine());
  });

  private readonly _allLocationOptions = ['站点', '区间', '车场', '自定义'];

  locationOptions = computed(() => {
    const { eventType } = this.values();
    if (eventType === '基地事件') {
      return ['车场'];
    }
    return this._allLocationOptions;
  });

  stationOptions = computed(() => this.stations().map((s) => s.name || ''));
  depotOptions = computed(() => this.depots().map((d) => d.name || ''));

  locationButtonVisible = computed(() => {
    if (this.isEditMode()) return false;
    if (!this.composedLine()) return false;
    return !this.isDepot();
  });
  eventTypeOptions: string[] = [...occEventTypes.map((op) => op)];
  firstLocationSelectOptions = computed(() => {
    if (this.isDepot()) {
      return this.depotOptions();
    }
    return this.stationOptions();
  });

  values = signal(initialValues);
  errors = signal({
    location: '',
    startTime: '',
  });

  confirmLocate$ = this.occEventBusService.on(OccEventType.CONFIRM_LOCATE);

  constructor(
    // private api: ApiService,
    private occEventBusService: OccEventBusService,
    private occMapLocateService: OccMapLocateService,
  ) {
    this.confirmLocate$.subscribe(() => {
      this.afterConfirmLocate();
    });
    effect(() => {
      if (this.action()) {
        this.resetValues();
      }
    });
  }

  ngAfterViewInit() {}

  resetValues() {
    if (this.action() === 'edit') {
      this.values.update((prev) => ({
        ...prev,
        ...this.data(),
        startTime: new Date(this.data()?.startTime || ''),
        images:
          this.data()?.images?.map((i) => ({
            uid: i,
            name: i,
            url: i,
          })) || [],
      }));
    } else {
      this.values.set({
        ...initialValues,
        images: [],
      });
    }
  }
  setLine(line: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      line: line as string,
      startStation: '',
      endStation: '',
      customPosition: '',
    }));
  }
  setEventType(type: string | string[]) {
    if (type === '基地事件') {
      this.values.update((prev) => ({
        ...prev,
        eventType: type as string,
        locationType: '车场',
        startStation: '',
        endStation: '',
        customPosition: '',
        trainNumber: '',
      }));
      return;
    }
    this.values.update((prev) => ({
      ...prev,
      trainNumber: '',
      eventType: type as string,
    }));
  }
  setOtherEvent(event: string) {
    this.values.update((prev) => ({ ...prev, otherEvent: event }));
  }
  setEffectDuration(d: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      effectDuration: getEffectDurationValue(d as string),
    }));
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
  onStartStationChange(station: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      startStation: station as string,
    }));
  }
  onEndStationChange(station: string | string[]) {
    this.values.update((prev) => ({ ...prev, endStation: station as string }));
  }
  onDirectionChange(direction: string | string[]) {
    this.values.update((prev) => ({ ...prev, direction: direction as string }));
  }
  setDescription(description: string) {
    this.values.update((prev) => ({ ...prev, description: description }));
  }

  setUrgentRepair(urgentRepair: number) {
    this.values.update((prev) => ({ ...prev, urgentRepair }));
  }
  setEffect(effect: number) {
    this.values.update((prev) => ({ ...prev, effect, effectDuration: effect }));
  }
  setSeverity(severity: number) {
    this.values.update((prev) => ({ ...prev, severity }));
  }
  setTrainNumber(trainNumber: string) {
    this.values.update((prev) => ({ ...prev, trainNumber }));
  }

  isSingleStation = computed(() => this.values().locationType === '站点');
  isDepot = computed(() => this.values().locationType === '车场');
  isIntervalStation = computed(() => this.values().locationType === '区间');
  isCustomPosition = computed(() => this.values().locationType === '自定义');
  shouldShowDirection = computed(() => this.isIntervalStation());
  directionOptions = computed(() => getDirectionOptions(this.composedLine()));

  isTrainBreakdown = computed(() => this.values().eventType === '列车故障');
  isOtherEvent = computed(() => this.values().eventType === '其他事件');

  handleLocate() {
    // this.onLocationTypeChange(this.values().locationType);
    if (this.isSingleStation()) {
      this.onLocate.emit({ type: 1, line: this.composedLine() });
    } else if (this.isIntervalStation()) {
      this.onLocate.emit({
        type: 2,
        line: this.composedLine(),
        values: {
          startStation: this.values().startStation,
          endStation: this.values().endStation,
        },
      });
    } else if (this.isCustomPosition()) {
      this.onLocate.emit({ type: 3, line: this.composedLine() });
    }
  }

  terminateLocate() {
    this.onLocate.emit({ type: 0, line: this.composedLine() });
  }
  onStartTimeChange(date: Date) {
    // this.values.update((prev) => ({ ...prev, startTime: date.toISOString() }));
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

  async submit() {
    await this.validate();
    if (this.action() === 'add') {
      await this.onAddEvent();
    } else {
      await this.onEditEvent();
    }
  }

  async onAddEvent() {
    const values = this.values();
    this.onAdd.emit({
      ...values,
      images: this.imageUploadGroup.urls,
      startTime: new Date(values.startTime).toISOString(),
      line: this.composedLine(),
      source: this.isCocc() ? 'COCC' : 'OCC',
    });
  }

  async onEditEvent() {
    const values = this.values();
    this.onEdit.emit({
      ...this.data(),
      ...values,
      images: this.imageUploadGroup.urls,
      line: this.composedLine(),
      startTime: new Date(values.startTime).toISOString(),
    });
  }

  async validate() {
    await this.validateLocation();
  }
  validateLocation(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.isSingleStation() || this.isDepot()) {
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
}
