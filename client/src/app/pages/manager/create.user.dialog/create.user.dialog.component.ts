import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  Validators,
} from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { CommonNzModule } from '../../../common.nz.module';
import { ApiService } from '../../../services/api.service';
import { CryptoService } from '../../../services/crypto.service';
import { RoleSelectorComponent } from '../../common/role.selector/role.selector.component';

@Component({
  selector: 'app-create.user.dialog',
  imports: [CommonNzModule, RoleSelectorComponent],
  templateUrl: './create.user.dialog.component.html',
  styleUrl: './create.user.dialog.component.less',
})
export class CreateUserDialogComponent {
  constructor(
    private readonly api: ApiService,
    private readonly fb: NonNullableFormBuilder,
    private readonly modalRef: NzModalRef,
    private readonly crypto: CryptoService,
  ) {
    this.form = fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(20),
        ],
      ],
      nickname: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(20),
        ],
      ],
      roles: [[] as string[], [Validators.required]],
      department: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(20),
        ],
      ],
    });
  }

  form: FormGroup<{
    username: FormControl<string>;
    nickname: FormControl<string>;
    roles: FormControl<string[]>;
    department: FormControl<string>;
  }>;

  loading = false;

  async handleCreate() {
    if (this.form.valid) {
      this.loading = true;
      this.api.user
        .create({
          username: this.form.value.username!,
          nickname: this.form.value.nickname!,
          roles: this.form.value.roles!,
          department: this.form.value.department!,
        })
        .then(() => this.modalRef.close(true))
        .finally(() => (this.loading = false));
    } else {
      Object.values(this.form.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }
}
