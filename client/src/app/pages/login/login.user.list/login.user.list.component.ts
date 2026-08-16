import { Component, EventEmitter, Output } from '@angular/core';
import { CommonNzModule } from '../../../common.nz.module';
import { StorageService } from '../../../services/storage.service';
import { StorageUser } from '../../../services/storage.user';

@Component({
  selector: 'app-login-user-list',
  imports: [CommonNzModule],
  templateUrl: './login.user.list.component.html',
  styleUrl: './login.user.list.component.less',
})
export class LoginUserListComponent {
  constructor(private readonly storage: StorageService) {}

  @Output() selectUser: EventEmitter<StorageUser> = new EventEmitter();

  users: StorageUser[] = [];

  ngOnInit(): void {
    this.users = this.storage.getUsers();
  }

  select(item: StorageUser) {
    this.selectUser.emit(item);
  }

  remove(item: StorageUser) {
    this.storage.removeUser(item.id);
    this.users = this.storage.getUsers();
  }
}
