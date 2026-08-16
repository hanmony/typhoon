import { Component } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { passwordPattern } from '../../../app.util';
import { CommonNzModule } from '../../../common.nz.module';
import { ApiService } from '../../../services/api.service';
import { CryptoService } from '../../../services/crypto.service';
import { SettingService } from '../../../services/setting.service';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-change.password.dialog',
  imports: [CommonNzModule],
  templateUrl: './change.password.dialog.component.html',
  styleUrl: './change.password.dialog.component.less',
})
export class ChangePasswordDialogComponent {
  constructor(
    fb: NonNullableFormBuilder,
    private readonly crypto: CryptoService,
    private readonly api: ApiService,
    private readonly storage: StorageService,
    private readonly settings: SettingService,
    private readonly modalRef: NzModalRef,
  ) {
    this.form = fb.group({
      oldPassword: [
        '',
        [
          Validators.required,
          Validators.maxLength(20),
          Validators.minLength(4),
        ],
      ],
      password: [
        '',
        [Validators.required, Validators.pattern(passwordPattern)],
      ],
      password2: ['', [Validators.required, this.confirmationValidator]],
    });
  }

  loading = false;
  readonly form: FormGroup<{
    oldPassword: FormControl<string>;
    password: FormControl<string>;
    password2: FormControl<string>;
  }>;

  updateConfirmValidator(): void {
    /** wait for refresh value */
    Promise.resolve().then(() =>
      this.form.controls.password2.updateValueAndValidity(),
    );
  }

  confirmationValidator: ValidatorFn = (
    control: AbstractControl,
  ): { [s: string]: boolean } => {
    if (!control.value) {
      return { required: true };
    } else if (control.value !== this.form.controls.password.value) {
      return { confirm: true, error: true };
    }
    return {};
  };

  handleCancel() {
    this.modalRef.close();
  }

  async handleChange() {
    if (this.form.valid) {
      this.loading = true;
      await this.api.user
        .fetchEncryptionParam()
        .then(async (param) => {
          const key = param.key;
          const iv = param.iv;
          const newPassword = this.crypto.sm4Encrypt(
            this.form.controls.password.value,
            key,
            iv,
          );
          await this.api.user
            .changePassword({
              oldPassword: this.crypto.sm3(
                this.form.controls.oldPassword.value,
              ),
              newPassword: newPassword,
            })
            .then(() => {
              const user = this.storage
                .getUsers()
                .find((i) => i.id == this.settings.user?.id);
              user!.password = this.form.controls.password.value;
              this.storage.addUser(user!);
              this.storage.setString(
                'password',
                this.form.controls.password.value,
              );
              this.modalRef.close(true);
            });
          // .finally(() => (this.loading = false));
        })
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
