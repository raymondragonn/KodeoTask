import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UdpNotificationService {
  private notificationSubject = new Subject<any>();
  public notification$ = this.notificationSubject.asObservable();
  private udpSocket?: any; // WebSocket o similar para UDP en navegador
  private isRegistered = false;

  constructor(private authService: AuthService) {
    // En un navegador, no podemos usar UDP directamente
    // Usaremos WebSocket o polling como alternativa
    // Por ahora, simularemos con polling
    this.startPolling();
  }

  registerForNotifications(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || this.isRegistered) return;

    // En un navegador real, esto se haría a través de WebSocket
    // Por ahora, usamos polling como alternativa
    this.isRegistered = true;
  }

  private startPolling(): void {
    // Polling como alternativa a UDP en navegador
    // En producción, usar WebSocket
    setInterval(() => {
      if (this.authService.isAuthenticated() && this.isRegistered) {
        // El polling real se haría aquí si fuera necesario
        // Por ahora, las notificaciones se manejan en el TaskService
      }
    }, 5000);
  }

  // Método para recibir notificaciones (llamado desde el cliente TCP)
  receiveNotification(notification: any): void {
    this.notificationSubject.next(notification);
  }

  // Nota: En un navegador, no podemos usar UDP directamente
  // Una alternativa sería usar WebSocket para notificaciones en tiempo real
  // Este servicio está preparado para esa integración
}

