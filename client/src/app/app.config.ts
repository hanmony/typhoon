import {
  ApplicationConfig,
  LOCALE_ID,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { registerLocaleData } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import zh from '@angular/common/locales/zh';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';
import { NZ_I18N, provideNzI18n, zh_CN } from 'ng-zorro-antd/i18n';
import { provideMarkdown } from 'ngx-markdown';
import { AppInterceptor } from './app.interceptor';
import { routes } from './app.routes';
import { SocketService } from './services/socket.service';

registerLocaleData(zh);

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserModule),
    importProvidersFrom(BrowserAnimationsModule),
    importProvidersFrom(FormsModule),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideRouter(routes),
    provideNzI18n(zh_CN),
    { provide: LOCALE_ID, useValue: 'zh' },
    { provide: NZ_I18N, useValue: zh_CN },
    { provide: HTTP_INTERCEPTORS, useClass: AppInterceptor, multi: true },
    provideMarkdown(),
    SocketService,
  ],
};
