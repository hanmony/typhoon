import { Component } from '@angular/core';
import { OpRecordDrawerComponent } from '../../../dispatch-dashboard/op-record-drawer/op-record-drawer.component';

@Component({
  selector: 'supervisor-op-record-drawer',
  imports: [],
  templateUrl:
    '../../../dispatch-dashboard/op-record-drawer/op-record-drawer.component.html',
  styleUrl: './op-record-drawer.component.less',
})
export class SupervisorOpRecordDrawerComponent extends OpRecordDrawerComponent {}
