import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'occ-message-tip',
  imports: [],
  templateUrl: './message-tip.component.html',
  styleUrl: './message-tip.component.less',
})
export class OccMessageTipComponent {
  visible = signal(false);
  messageText = signal('');
  confirmable = signal(false);

  onCancel = output<void>();
  onConfirm = output<void>();

  handleCancel() {
    this.onCancel.emit();
    this.visible.set(false);
  }

  handleConfirm() {
    this.onConfirm.emit();
    this.confirmable.set(false);
    this.visible.set(false);
  }

  handleQuery(flag: boolean) {
    this.confirmable.set(flag);
  }

  showMessage(text: string) {
    this.messageText.set(text);
    this.visible.set(true);
  }

  hideMessage() {
    this.visible.set(false);
  }
}
