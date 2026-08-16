import { Injectable } from '@angular/core';
import { AuthApi } from './apis/auth';
import { ExtremeApi } from './apis/extreme';
import { LibraryApi } from './apis/library';
import { LogApi } from './apis/log';
import { ManagerApi } from './apis/manager';
import { PatrollingApi } from './apis/patrolling';
import { UserApi } from './apis/user';
import { KnowledgeBaseApi } from './apis/knowledge-base';
import { ChatApi } from './apis/chat';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    public readonly http: HttpService,
    public readonly manager: ManagerApi,
    public readonly auth: AuthApi,
    public readonly user: UserApi,
    public readonly log: LogApi,
    public readonly library: LibraryApi,
    public readonly extreme: ExtremeApi,
    public readonly patrolling: PatrollingApi,
    public readonly knowledgeBase: KnowledgeBaseApi,
    public readonly chat: ChatApi,
  ) {}

  getAllUrls(): string[] {
    const ret: string[] = [];
    for (const key in this) {
      if (Object.prototype.hasOwnProperty.call(this, key)) {
        const element = this[key];
        const proto = Object.getPrototypeOf(element);
        if (proto.urls) {
          proto.urls.forEach((url: string) => {
            ret.push(url);
          });
        }
      }
    }
    return ret;
  }
}
