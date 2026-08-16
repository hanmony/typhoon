import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface WarningRequirement {
  onDutyEscort: string;
  patrolInspection: string;
  otherRequirements: string;
}

@Component({
  selector: 'app-warning-popup',
  templateUrl: './warningPop-UpBox.component.html',
  styleUrls: ['./warningPop-UpBox.component.less'],
  standalone: true,
  imports: [CommonModule],
})
export class WarningPopupComponent {
  @Input() isVisible: boolean = false;
  @Input() title: string = '';
  @Input() content?: WarningRequirement;
  @Output() close = new EventEmitter<void>();

  hide() {
    this.close.emit();
  }
}
