import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CommonNzModule } from '../../common.nz.module';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login-x5',
  imports: [CommonNzModule],
  templateUrl: './login-x5.component.html',
  styleUrls: ['./login-x5.component.less'],
})
export class LoginX5Component implements OnInit {
  constructor(
    private readonly auth: AuthService,
    private readonly user: UserService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly messages: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      const ps = params['params'];
      this.loginX5(ps);
    });
  }

  private async loginX5(params: string) {
    await this.auth.loginX5(params);
    await this.user.login();
    await this.afterLogin();
  }

  private async afterLogin() {
    const { url } = this.router;
    const l = new URL(location.origin + url);
    const form = l.searchParams.get('from');
    const nvUrl = form ? form : '/portal';
    location.replace(nvUrl);
  }
}
