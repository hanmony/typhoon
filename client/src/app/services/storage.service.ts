import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { StorageUser } from './storage.user';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor(private readonly crypto: CryptoService) {}

  private readonly secret = 'typhoon-client-secret';
  private readonly prefix = 'typhoon-client';

  public addUser(user: StorageUser) {
    let users = this.getUsers().filter((i) => i.id != user.id);
    users = [user].concat(...users);
    this.setData('userlist', users);
  }

  public getUsers(): StorageUser[] {
    return this.getData<StorageUser[]>('userlist') ?? [];
  }

  public removeUser(id: string) {
    const users = this.getUsers().filter((i) => i.id != id);
    this.setData('userlist', users);
  }

  /**
   * @description Get the token from the local storage.
   */
  get token(): string | undefined {
    return this.getString('token');
  }

  /**
   * @description Set the token to the local storage.
   */
  set token(value: string) {
    this.setString('token', value);
  }

  getString(key: string): string | undefined {
    key = this.getRealKey(key);
    const result = localStorage.getItem(key);
    if (!result) {
      return undefined;
    }
    try {
      return this.crypto.aesDecrypt(result, this.secret);
    } catch (err) {
      console.error('decrypt error', err);
      return undefined;
    }
  }

  setString(key: string, data: string): void {
    key = this.getRealKey(key);
    if (!data || data.length <= 0) {
      localStorage.removeItem(key);
    }
    const result = this.crypto.aesEncrypt(data, this.secret);
    localStorage.setItem(key, result);
  }

  getNumber(key: string): number | undefined {
    const result = this.getString(key);
    return Number(result) ?? undefined;
  }

  setNumber(key: string, data: number): void {
    return this.setString(key, String(data));
  }

  getBoolean(key: string): boolean {
    key = this.getRealKey(key);
    const item = localStorage.getItem(key);
    return item != undefined;
  }

  setBoolean(key: string, data: boolean): void {
    key = this.getRealKey(key);
    if (data) {
      localStorage.setItem(key, '1');
    } else {
      localStorage.removeItem(key);
    }
  }

  getData<T>(key: string): T | undefined {
    const json = this.getString(key);
    if (!json) {
      return undefined;
    }
    return JSON.parse(json) as T;
  }

  setData<T>(key: string, data: T): void {
    if (!data) {
      key = this.getRealKey(key);
      localStorage.removeItem(key);
      return;
    }
    const json = JSON.stringify(data);
    this.setString(key, json);
  }

  private getRealKey(key: string) {
    return `${this.prefix}-${key}`;
  }
}
