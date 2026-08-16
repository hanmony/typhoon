import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment as env } from '../environments/environment';
import { AuthService } from './services/auth.service';

@Injectable()
export class AppInterceptor implements HttpInterceptor {
  constructor(private readonly auth: AuthService) {
    this.baseUrl = env.baseUrl;
  }

  private readonly baseUrl: string;

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    let url = `${this.baseUrl}${request.url}`;
    if (/^\/assets\/.+(doc?x|pdf)$/.test(request.url)) {
      url = url = `${request.url}`;
    }
    let authReq = request.clone({
      url,
    });
    const token = this.auth.getToken();
    if (token) {
      authReq = authReq.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
    return next.handle(authReq);
  }
}
