import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Task, TaskStatus } from '../models/task.model';
import { AuthService } from './auth.service';
import { UdpNotificationService } from './udp-notification.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = environment.apiUrl;
  private taskUpdateSubject = new Subject<Task>();
  public taskUpdate$ = this.taskUpdateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private udpService: UdpNotificationService
  ) {
    // Suscribirse a notificaciones (preparado para WebSocket en el futuro)
    this.udpService.notification$.subscribe(notification => {
      this.handleUdpNotification(notification);
    });
  }

  getTasks(): Observable<Task[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Task[]>(`${this.apiUrl}/api/tasks`, { headers });
  }

  getTask(id: number): Observable<Task> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Task>(`${this.apiUrl}/api/tasks/${id}`, { headers });
  }

  createTask(task: Partial<Task>): Observable<Task> {
    const headers = this.authService.getAuthHeaders();
    console.log('=== DEBUG TaskService.createTask ===');
    console.log('URL:', `${this.apiUrl}/api/tasks`);
    console.log('Task data:', task);
    console.log('Headers:', headers.keys());
    
    return this.http.post<Task>(`${this.apiUrl}/api/tasks`, task, { headers });
  }

  updateTask(id: number, task: Partial<Task>): Observable<Task> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<Task>(`${this.apiUrl}/api/tasks/${id}`, task, { headers });
  }

  deleteTask(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/api/tasks/${id}`, { headers });
  }

  private handleUdpNotification(notification: any): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    switch (notification.type) {
      case 'task_created':
      case 'task_updated':
      case 'task_assigned':
        // La notificación ya viene con el objeto task
        if (notification.task) {
          this.taskUpdateSubject.next(notification.task);
          // Recargar tareas para sincronizar
          this.getTasks().subscribe({
            next: () => {
              // Las tareas se actualizarán automáticamente
            }
          });
        }
        break;
      case 'task_deleted':
        // Notificar que una tarea fue eliminada
        this.taskUpdateSubject.next({ id: notification.taskId } as Task);
        // Recargar tareas
        this.getTasks().subscribe();
        break;
    }
  }
}

