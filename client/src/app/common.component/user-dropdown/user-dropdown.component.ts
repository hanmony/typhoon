import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonNzModule } from '../../common.nz.module';
import { ApiService } from '../../services/api.service';
import { SettingService } from '../../services/setting.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'common-user-dropdown',
  imports: [CommonNzModule],
  templateUrl: './user-dropdown.component.html',
  styleUrl: './user-dropdown.component.less',
})
export class CommonUserDropdownComponent {
  loading = false;
  constructor(
    public readonly settings: SettingService,
    private readonly storage: StorageService,
    private readonly api: ApiService,
    private readonly router: Router,
  ) {}
  handleLogout() {
    this.loading = true;
    this.api.auth
      .logout()
      .then(() => {
        this.settings.clear();
        this.storage.token = '';
        this.router.navigate(['/login']);
      })
      .finally(() => (this.loading = false));
  }
}
