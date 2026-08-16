import { Component, output, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { z } from 'zod';
import { LibraryNzModule } from '../../../library.nz.module';
import {
  CommandService,
  emergencyResponseDegreeOptions,
} from '../map/command.service';
import { OccModalSelectComponent } from '../widget/select/select.component';

const EventAddParamsValidator = z.object({
  startStation: z.string().nonempty('请选择起始站点'),
  endStation: z.string().nonempty('请选择结束站点'),
  direction: z.string().nonempty('请选择上下行'),
  customPosition: z.string().nonempty('请定位显示位置'),
});

const initialValues = {
  municipalDegree: '',
  municipalFlag: false,
  corporateDegree: '',
  corporateFlag: false,
};

@Component({
  selector: 'emergency-response-modal',
  imports: [OccModalSelectComponent, LibraryNzModule, NzSwitchModule],
  templateUrl: './emergency-response-modal.component.html',
  styleUrl: './emergency-response-modal.component.less',
})
export class EmergencyResponseModalComponent {
  onClose = output();

  values = signal(initialValues);

  degreeOptions = signal(
    emergencyResponseDegreeOptions.map((item) => item.label),
  );

  constructor(
    private commandService: CommandService,
    private message: NzMessageService,
  ) {}
  get command() {
    return this.commandService.command;
  }

  onMunicipalDegreeChange(value: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      municipalDegree: value as string,
    }));
  }

  onCorporateDegreeChange(value: string | string[]) {
    this.values.update((prev) => ({
      ...prev,
      corporateDegree: value as string,
    }));
  }

  ngAfterViewInit() {
    this.resetValues();
  }

  resetValues() {
    const { municipalDegree, municipalFlag, corporateDegree, corporateFlag } =
      this.command;
    this.values.update((prev) => ({
      ...prev,
      municipalDegree:
        emergencyResponseDegreeOptions.find(
          (item) => item.value === municipalDegree,
        )?.label || '',
      municipalFlag: municipalFlag === 1,
      corporateDegree:
        emergencyResponseDegreeOptions.find(
          (item) => item.value === corporateDegree,
        )?.label || '',
      corporateFlag: corporateFlag === 1,
    }));
  }

  async submit() {
    await this.validate();

    await this.onEdit();
  }

  async onEdit() {
    const values = this.values();

    await this.commandService.updateEmergencyResponse({
      municipalDegree:
        emergencyResponseDegreeOptions.find(
          (item) => item.label === values.municipalDegree,
        )?.value || '',
      corporateDegree:
        emergencyResponseDegreeOptions.find(
          (item) => item.label === values.corporateDegree,
        )?.value || '',
      municipalFlag: values.municipalFlag ? 1 : 0,
      corporateFlag: values.corporateFlag ? 1 : 0,
    });

    this.message.success('应急响应已更新');

    this.onClose.emit();
  }

  async validate() {
    //   await this.validateLocation();
  }
}
