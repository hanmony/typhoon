import { Component, Input } from '@angular/core';
import { getRoleName } from '../../../app.util';
import { CommonNzModule } from '../../../common.nz.module';

@Component({
  selector: 'app-role-list',
  imports: [CommonNzModule],
  templateUrl: './role.list.component.html',
  styleUrl: './role.list.component.less',
})
export class RoleListComponent {
  @Input() roles: string[] = [];

  roleName(role: string) {
    return getRoleName(role);
  }
}
