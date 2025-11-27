import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import SockJS from 'sockjs-client';
import { Client, Message } from '@stomp/stompjs';

@Injectable({
  providedIn: 'root'
})
export class UdpNotificationService implements OnDestroy {
  private notificationSubject = new Subject<any>();
  public notification$ = this.notificationSubject.asObservable();
  private stompClient: Client | null = null;
  private isConnected = false;
  private currentUserId: number | null = null;

  constructor(private authService: AuthService) {
    // Suscribirse a cambios en el usuario autenticado
    this.authService.currentUser$.subscribe(user => {
      if (user && user.id) {
        if (this.currentUserId !== user.id) {
          this.currentUserId = user.id;
          this.connect();
        }
      } else {
        this.disconnect();
      }
    });

    // Intentar conectar si ya hay un usuario autenticado
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.currentUserId = currentUser.id;
      this.connect();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private connect(): void {
    if (this.isConnected || !this.currentUserId) {
      return;
    }

    const socket = new SockJS(`${environment.apiUrl}/ws`);
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.isConnected = true;
        this.subscribeToNotifications();
      },
      onStompError: (frame) => {
        console.error('Error en WebSocket:', frame);
        this.isConnected = false;
      },
      onDisconnect: () => {
        this.isConnected = false;
      }
    });

    this.stompClient.activate();
  }

  private subscribeToNotifications(): void {
    if (!this.stompClient || !this.isConnected || !this.currentUserId) {
      return;
    }

    const topic = `/topic/user/${this.currentUserId}/tasks`;
    
    this.stompClient.subscribe(topic, (message: Message) => {
      try {
        const notification = JSON.parse(message.body);
        this.notificationSubject.next(notification);
      } catch (error) {
        console.error('Error al parsear notificación:', error);
      }
    });
  }

  private disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.isConnected = false;
      this.currentUserId = null;
    }
  }

  registerForNotifications(): void {
    // Ya se registra automáticamente al conectarse
    if (!this.isConnected) {
      this.connect();
    }
  }

  // Método para recibir notificaciones (mantenido para compatibilidad)
  receiveNotification(notification: any): void {
    this.notificationSubject.next(notification);
  }
}
