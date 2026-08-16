import { Component, signal } from '@angular/core';
import { horizontalInOutReverse } from '../../common.animation';
import {
  CommandService,
  emergencyResponseDegreeOptions,
} from '../../pages/occ/map/command.service';

@Component({
  selector: 'emergency-response-alerts',
  imports: [],
  templateUrl: './emergency-response-alerts.component.html',
  styleUrl: './emergency-response-alerts.component.less',
  animations: [horizontalInOutReverse],
})
export class EmergencyResponseAlertsComponent {
  constructor(private commandService: CommandService) {
    commandService.commandSetupSubject$.subscribe(() => {
      this.updateState();
    });
  }
  get command() {
    return this.commandService.command;
  }

  state = signal({
    /** 市级应急响应 */
    municipalDegree: 0,
    municipalDegreeInChinese: '',
    municipalDegreeIcon: '',
    /** 企业级应急响应 */
    corporateDegree: 0,
    corporateDegreeInChinese: '',
    corporateDegreeIcon: '',
  });

  mapDegreeNumber(value: string) {
    const values = emergencyResponseDegreeOptions.map((e) => e.value);
    return values.indexOf(value) + 1;
  }
  mapDegreeChinese(value: number) {
    return (
      {
        1: '一',
        2: '二',
        3: '三',
        4: '四',
      }[value] || ''
    );
  }

  mapDegreeIcon(value: number) {
    return (
      {
        1: 'assets/images/map/emergency-response/icon-1.png',
        2: 'assets/images/map/emergency-response/icon-2.png',
        3: 'assets/images/map/emergency-response/icon-3.png',
        4: 'assets/images/map/emergency-response/icon-4.png',
      }[value] || ''
    );
  }
  updateState() {
    let municipalDegree = 0;
    let corporateDegree = 0;
    const {
      municipalDegree: commandMunicipalDegree,
      municipalFlag,
      corporateDegree: commandCorporateDegree,
      corporateFlag,
    } = this.command;
    if (municipalFlag) {
      municipalDegree = this.mapDegreeNumber(commandMunicipalDegree);
    }
    if (corporateFlag) {
      corporateDegree = this.mapDegreeNumber(commandCorporateDegree);
    }
    this.state.set({
      municipalDegree,
      municipalDegreeInChinese: this.mapDegreeChinese(municipalDegree),
      municipalDegreeIcon: this.mapDegreeIcon(municipalDegree),
      corporateDegree,
      corporateDegreeIcon: this.mapDegreeIcon(corporateDegree),
      corporateDegreeInChinese: this.mapDegreeChinese(corporateDegree),
    });
  }
}
