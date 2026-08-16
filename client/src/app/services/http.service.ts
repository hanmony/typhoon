import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, catchError, delay, throwError } from 'rxjs';
import { environment as env } from '../../environments/environment';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class HttpService {
  constructor(
    private readonly http: HttpClient,
    private readonly messages: NzMessageService,
    private readonly storage: StorageService,
    private readonly router: Router,
  ) {}

  public async get<T>(url: string, params?: any): Promise<T> {
    return this.getRequest(url, false, params);
  }

  public async getSilent<T>(url: string, params?: any): Promise<T> {
    return this.getRequest(url, true, params);
  }

  public async post<T>(url: string, body?: any): Promise<T> {
    return this.postRequest(url, false, body);
  }

  public async postSilent<T>(url: string, body?: any): Promise<T> {
    return this.postRequest(url, true, body);
  }

  public async patch<T>(url: string, body?: any): Promise<T> {
    return this.patchRequest<T>(url, false, body);
  }

  public async patchSilent<T>(url: string, body?: any): Promise<T> {
    return this.patchRequest<T>(url, true, body);
  }

  public async put<T>(url: string, body?: any): Promise<T> {
    return this.putRequest<T>(url, false, body);
  }

  public async putSilent<T>(url: string, body?: any): Promise<T> {
    return this.putRequest<T>(url, true, body);
  }

  public async delete<T>(url: string, params?: any): Promise<T> {
    return this.deleteRequest(url, false, params);
  }

  public async deleteSilent<T>(url: string, params?: any): Promise<T> {
    return this.deleteRequest(url, true, params);
  }

  public async download(url: string, method: 'post' | 'get', params?: any) {
    return new Promise<Blob>((resolve, reject) => {
      const ob =
        method == 'get'
          ? this.http.get(url, {
              params,
              responseType: 'blob',
              observe: 'response',
            })
          : this.http.post(url, params, {
              responseType: 'blob',
              observe: 'response',
            });
      ob.pipe(
        catchError((err: HttpErrorResponse) => {
          console.error('http error', err);
          if (err.error?.message) {
            this.messages.error(err.error.message);
          } else {
            this.messages.error(err.error);
          }
          reject(err);
          return throwError(() => err);
        }),
      ).subscribe((res) => {
        const contentType = 'application/octet-stream;charset=UTF-8';
        const blob = new Blob([res.body!], { type: contentType });
        // 创建一个URL对象
        const objectURL = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectURL;
        a.download =
          res.headers.get('Content-Disposition')?.split('=')[1] ?? '';
        a.download = a.download.replaceAll(`"`, '');
        a.click();
        // 释放已创建的URL对象
        window.URL.revokeObjectURL(objectURL);
        resolve(res.body!);
      });
    });
  }

  private async getRequest<T>(
    url: string,
    silent: boolean,
    params?: any,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ob = this.http.get<T>(url, { params });
      this.httpPipe(ob, resolve, reject, silent);
    });
  }

  private async postRequest<T>(
    url: string,
    silent: boolean,
    body?: any,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ob = this.http.post<T>(url, body);
      return this.httpPipe(ob, resolve, reject, silent);
    });
  }

  private async patchRequest<T>(
    url: string,
    silent: boolean,
    body?: any,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ob = this.http.patch<T>(url, body);
      return this.httpPipe(ob, resolve, reject, silent);
    });
  }

  private async putRequest<T>(
    url: string,
    silent: boolean,
    body?: any,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ob = this.http.put<T>(url, body);
      return this.httpPipe(ob, resolve, reject, silent);
    });
  }

  private async deleteRequest<T>(
    url: string,
    silent: boolean,
    params?: any,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ob = this.http.delete<T>(url, { params });
      return this.httpPipe(ob, resolve, reject, silent);
    });
  }

  private httpPipe<T>(
    ob: Observable<T>,
    resolve: (res: T) => void,
    reject: (err: any) => void,
    silent = false,
  ) {
    let error: unknown = undefined;
    ob.pipe(
      delay(env.httpDelay),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          if (
            err.error.message === 'token expired' &&
            this.storage.token &&
            this.storage.token.length > 0
          ) {
            this.messages.error('登录信息已过期，请重新登录');
          }
          this.router.navigate(['/login'], {
            queryParams: { from: location.pathname },
          });
          reject(err);
          return throwError(() => err);
        }
        if (!silent) {
          if (err.error?.message) {
            this.messages.error(err.error.message);
          } else {
            this.messages.error(err.error);
          }
        }
        error = err;
        reject(err);
        return throwError(() => err);
      }),
    ).subscribe((res) => {
      if (!error) {
        resolve(res);
      }
    });
  }
}
