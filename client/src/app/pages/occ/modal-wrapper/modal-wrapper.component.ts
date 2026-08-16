import { Component, computed, HostBinding, input, output } from '@angular/core';

@Component({
  selector: 'occ-modal-wrapper',
  imports: [],
  templateUrl: './modal-wrapper.component.html',
  styleUrl: './modal-wrapper.component.less',
})
export class OccModalWrapperComponent {
  @HostBinding('class.hide') isHide = input<boolean>(false);

  title = input<string>('');
  submitText = input<string>('');
  action = input<'add' | 'edit'>('add');
  onClose = output<void>();
  onSubmit = output<void>();

  actionText = computed(() => {
    const submitText = this.submitText();
    const action = this.action();
    if (submitText) return submitText;
    return action === 'add' ? '填报' : '修改';
  });

  handleCancel() {
    this.onClose.emit();
  }

  handleSubmit() {
    this.onSubmit.emit();
  }
}
