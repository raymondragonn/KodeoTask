import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Task, TaskStatus } from '../models/task.model';
import { AuthService } from './auth.service';
import { UdpNotificationService } from './udp-notification.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = 'http://localhost:8080';
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

  // Almacenamiento temporal en memoria (se pierde al recargar)
  private mockTasks: Task[] = [
    {
      id: 1,
      title: 'Creación de CV Inglés',
      description: 'Crear currículum en inglés',
      status: TaskStatus.PENDING,
      createdBy: 1,
      category: 'Pendientes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Aprender Flutter',
      description: 'Estudiar Flutter para desarrollo móvil',
      status: TaskStatus.PENDING,
      createdBy: 1,
      category: 'Pendientes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Aprender Figma',
      description: 'Aprender diseño en Figma',
      status: TaskStatus.PENDING,
      createdBy: 1,
      category: 'Pendientes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 4,
      title: 'Estudiar documentos PDF para concretar llamada de venta',
      description: 'Revisar documentos antes de la llamada',
      status: TaskStatus.PENDING,
      createdBy: 1,
      category: 'Pendientes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 5,
      title: 'Cancelar Tarjeta: Azul BBVA',
      description: 'Cancelar tarjeta de crédito',
      status: TaskStatus.PENDING,
      createdBy: 1,
      category: 'Finanzas',
      dueDate: new Date(2027, 2, 2).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  getTasks(): Observable<Task[]> {
    // SERVICIO DESACTIVADO - Modo mock
    // const headers = this.authService.getAuthHeaders();
    // return this.http.get<Task[]>(`${this.apiUrl}/api/tasks`, { headers });
    
    return of([...this.mockTasks]).pipe(delay(300));
  }

  getTask(id: number): Observable<Task> {
    // SERVICIO DESACTIVADO - Modo mock
    // const headers = this.authService.getAuthHeaders();
    // return this.http.get<Task>(`${this.apiUrl}/api/tasks/${id}`, { headers });
    
    return new Observable(observer => {
      setTimeout(() => {
        const task = this.mockTasks.find(t => t.id === id);
        if (task) {
          observer.next({ ...task });
        } else {
          observer.error({ message: 'Tarea no encontrada' });
        }
        observer.complete();
      }, 300);
    });
  }

  createTask(task: Partial<Task>): Observable<Task> {
    // SERVICIO DESACTIVADO - Modo mock
    // const headers = this.authService.getAuthHeaders();
    // return this.http.post<Task>(`${this.apiUrl}/api/tasks`, task, { headers });
    
    return new Observable(observer => {
      setTimeout(() => {
        const newTask: Task = {
          id: this.mockTasks.length + 1,
          title: task.title || '',
          description: task.description || '',
          status: task.status || TaskStatus.PENDING,
          createdBy: 1,
          category: task.category,
          dueDate: task.dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.mockTasks.push(newTask);
        observer.next(newTask);
        observer.complete();
      }, 300);
    });
  }

  updateTask(id: number, task: Partial<Task>): Observable<Task> {
    // SERVICIO DESACTIVADO - Modo mock
    // const headers = this.authService.getAuthHeaders();
    // return this.http.put<Task>(`${this.apiUrl}/api/tasks/${id}`, task, { headers });
    
    return new Observable(observer => {
      setTimeout(() => {
        const index = this.mockTasks.findIndex(t => t.id === id);
        if (index !== -1) {
          this.mockTasks[index] = {
            ...this.mockTasks[index],
            ...task,
            updatedAt: new Date().toISOString()
          } as Task;
          observer.next({ ...this.mockTasks[index] });
        } else {
          observer.error({ message: 'Tarea no encontrada' });
        }
        observer.complete();
      }, 300);
    });
  }

  deleteTask(id: number): Observable<any> {
    // SERVICIO DESACTIVADO - Modo mock
    // const headers = this.authService.getAuthHeaders();
    // return this.http.delete(`${this.apiUrl}/api/tasks/${id}`, { headers });
    
    return new Observable(observer => {
      setTimeout(() => {
        const index = this.mockTasks.findIndex(t => t.id === id);
        if (index !== -1) {
          this.mockTasks.splice(index, 1);
          observer.next({ success: true, message: 'Tarea eliminada (modo mock)' });
        } else {
          observer.error({ message: 'Tarea no encontrada' });
        }
        observer.complete();
      }, 300);
    });
  }

  private handleUdpNotification(notification: any): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    switch (notification.type) {
      case 'task_created':
      case 'task_updated':
      case 'task_assigned':
        const task: Task = JSON.parse(notification.data);
        this.taskUpdateSubject.next(task);
        break;
      case 'task_deleted':
        // Notificar que una tarea fue eliminada
        this.taskUpdateSubject.next({ id: notification.taskId } as Task);
        break;
    }
  }
}

