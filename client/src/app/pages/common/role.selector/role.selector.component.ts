import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { getSelectRoles } from '../../../app.util';
import { CommonNzModule } from '../../../common.nz.module';

@Component({
  selector: 'app-role-selector',
  imports: [CommonNzModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RoleSelectorComponent),
      multi: true,
    },
  ],
  templateUrl: './role.selector.component.html',
  styleUrl: './role.selector.component.less',
})
export class RoleSelectorComponent implements ControlValueAccessor {
  @Input() roles: string[] = [];
  @Output() rolesChange = new EventEmitter<string[]>();

  vaChangeFunc: (value: any) => void = () => {};
  writeValue(obj: any): void {
    this.roles = obj;
  }

  selectRoles(): {
    value: string;
    label: string;
  }[] {
    const roleselectList = getSelectRoles();
    return roleselectList;
  }

  registerOnChange(fn: any): void {
    this.vaChangeFunc = fn;
  }
  registerOnTouched(fn: any): void {}

  selectedRolesChanged() {
    this.vaChangeFunc(this.roles);
    this.rolesChange.emit(this.roles);
  }
}
