import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import socketConfig from '../socket.config';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private isConnected = false;
  private connectionSubject = new Subject<boolean>();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    try {
      this.socket = io(socketConfig.url, socketConfig.options);

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.connectionSubject.next(true);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.connectionSubject.next(false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
        this.connectionSubject.next(false);
      });
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  get connectionStatus$(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }

  get isSocketConnected(): boolean {
    return this.isConnected;
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on(event, (data: T) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off(event);
      };
    });
  }

  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    if (!this.isConnected) {
      console.warn('Socket not connected, message queued');
    }

    this.socket.emit(event, data);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  reconnect(): void {
    if (!this.socket) {
      this.initializeSocket();
    } else if (!this.isConnected) {
      this.socket.connect();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.connectionSubject.complete();
  }
}
