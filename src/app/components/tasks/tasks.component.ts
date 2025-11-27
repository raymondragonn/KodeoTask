import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { UserService, User } from '../../services/user.service';
import { UdpNotificationService } from '../../services/udp-notification.service';
import { Task, TaskStatus } from '../../models/task.model';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit, OnDestroy {
  // Exponer TaskStatus para uso en el template
  TaskStatus = TaskStatus;
  
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  currentUser: any = null;
  showCreateModal = false;
  showCreateListModal = false;
  showEditModal = false;
  showTaskDetailsModal = false;
  isEditingInDetails = false; // Controla si estamos editando en el modal de detalles
  selectedTask: Task | null = null;
  filterStatus: string = 'ALL';
  
  // Agrupación por categoría
  tasksByCategory: { [key: string]: Task[] } = {};
  categories: string[] = [];
  createdLists: Set<string> = new Set(); // Listas creadas explícitamente (incluso si están vacías)
  selectedCategory: string | null = null;
  showCompletedTasks: { [key: string]: boolean } = {};
  visibleCategories: { [key: string]: boolean } = {}; // Controla qué categorías están visibles
  sidebarVisible = true; // Controla la visibilidad del sidebar
  openMenuCategory: string | null = null; // Controla qué menú de categoría está abierto
  listsSectionVisible = true; // Controla la visibilidad del listado de listas
  viewMode: 'list' | 'columns' = 'list'; // Controla el modo de vista: lista o columnas
  showUserMenu = false; // Controla la visibilidad del menú de usuario
  showNotifications = false; // Controla la visibilidad del menú de notificaciones
  
  // Notificaciones
  notifications: Array<{id: number, task: Task, type: string, timestamp: Date, read: boolean}> = [];
  unreadCount = 0;
  
  // Formulario
  taskTitle = '';
  taskDescription = '';
  taskAssignedTo: number | null = null;
  taskCategory: string = '';
  taskDueDate: string = '';
  selectedUserIds: number[] = []; // Usuarios seleccionados para asignar
  
  // Formulario Lista
  listName = '';
  
  // Usuarios disponibles
  availableUsers: User[] = [];
  
  // Fecha actual
  currentDay: number = new Date().getDate();
  currentMonth: string = '';
  
  private subscriptions: Subscription[] = [];
  private documentClickHandler: ((event: Event) => void) | null = null;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService,
    private udpNotificationService: UdpNotificationService
  ) {}

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener usuario actual del servicio de autenticación
    this.currentUser = this.authService.getCurrentUser();
    
    // Si no hay usuario en el servicio, intentar obtenerlo del observable
    if (!this.currentUser) {
      const userSub = this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      });
      this.subscriptions.push(userSub);
    }
    
    // Inicializar fecha actual
    this.updateCurrentDate();
    
    // Cargar listas creadas desde localStorage
    this.loadCreatedLists();
    
    this.loadTasks();

    // Suscribirse a actualizaciones en tiempo real
    const sub = this.taskService.taskUpdate$.subscribe(task => {
      this.loadTasks(); // Recargar tareas cuando hay una actualización
    });
    this.subscriptions.push(sub);

    // Suscribirse a notificaciones UDP
    const notificationSub = this.udpNotificationService.notification$.subscribe((notification: any) => {
      this.handleNotification(notification);
    });
    this.subscriptions.push(notificationSub);
    
    // Cargar tareas asignadas al iniciar para mostrar notificaciones
    this.loadAssignedTasksNotifications();

    // Cerrar menú al hacer clic fuera
    this.documentClickHandler = this.handleDocumentClick.bind(this);
    document.addEventListener('click', this.documentClickHandler);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
    }
  }

  handleDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-container')) {
      this.closeCategoryMenu();
    }
    if (!target.closest('.user-menu-container')) {
      this.closeUserMenu();
    }
    if (!target.closest('.notifications-container')) {
      this.closeNotifications();
    }
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.applyFilter();
      },
      error: (err) => {
        console.error('Error al cargar tareas', err);
        // AUTENTICACIÓN DESACTIVADA
        // if (err.status === 401) {
        //   this.authService.logout();
        //   this.router.navigate(['/login']);
        // }
      }
    });
  }

  applyFilter(): void {
    if (this.filterStatus === 'ALL') {
      this.filteredTasks = this.tasks;
    } else {
      this.filteredTasks = this.tasks.filter(t => t.status === this.filterStatus);
    }
    this.groupTasksByCategory();
  }

  groupTasksByCategory(): void {
    this.tasksByCategory = {};
    this.categories = [];
    
    // Primero, agregar todas las listas creadas explícitamente (incluso si están vacías)
    this.createdLists.forEach(listName => {
      if (!this.tasksByCategory[listName]) {
        this.tasksByCategory[listName] = [];
        this.categories.push(listName);
        // Inicializar como visible si no existe
        if (this.visibleCategories[listName] === undefined) {
          this.visibleCategories[listName] = true;
        }
      }
    });
    
    // Luego, agregar tareas a sus categorías
    this.filteredTasks.forEach(task => {
      const category = task.category || 'Sin categoría';
      if (!this.tasksByCategory[category]) {
        this.tasksByCategory[category] = [];
        this.categories.push(category);
        // Inicializar como visible si no existe
        if (this.visibleCategories[category] === undefined) {
          this.visibleCategories[category] = true;
        }
      }
      this.tasksByCategory[category].push(task);
    });
    
    // Ordenar categorías
    this.categories.sort();
  }

  getVisibleCategories(): string[] {
    return this.categories.filter(category => this.visibleCategories[category] !== false);
  }

  toggleCategoryVisibility(category: string, event: Event): void {
    event.stopPropagation(); // Evitar que se active el click del contenedor
    this.visibleCategories[category] = !this.visibleCategories[category];
  }

  toggleCategoryVisibilityOnClick(category: string, event: Event): void {
    // Si el clic fue en el checkbox, no hacer nada (ya se maneja en toggleCategoryVisibility)
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('input')) {
      return;
    }
    // Toggle la visibilidad al hacer clic en la lista
    this.visibleCategories[category] = !this.visibleCategories[category];
  }

  isCategoryVisible(category: string): boolean {
    return this.visibleCategories[category] !== false;
  }

  getPendingTasks(category: string): Task[] {
    return this.tasksByCategory[category]?.filter(t => t.status !== TaskStatus.COMPLETED) || [];
  }

  getCompletedTasks(category: string): Task[] {
    return this.tasksByCategory[category]?.filter(t => t.status === TaskStatus.COMPLETED) || [];
  }

  toggleCompletedTasks(category: string): void {
    this.showCompletedTasks[category] = !this.showCompletedTasks[category];
  }


  onFilterChange(): void {
    this.applyFilter();
  }

  openCreateModal(category?: string): void {
    this.taskTitle = '';
    this.taskDescription = '';
    this.taskAssignedTo = null;
    this.taskCategory = category || '';
    this.taskDueDate = '';
    this.selectedUserIds = [];
    this.showCreateModal = true;
    this.loadUsers();
  }
  
  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        // Excluir el usuario actual de la lista
        const currentUserId = this.currentUser?.id;
        this.availableUsers = users.filter(user => user.id !== currentUserId);
      },
      error: (err) => {
        console.error('Error al cargar usuarios', err);
        this.availableUsers = [];
      }
    });
  }
  
  toggleUserSelection(userId: number): void {
    const index = this.selectedUserIds.indexOf(userId);
    if (index > -1) {
      this.selectedUserIds.splice(index, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
  }
  
  isUserSelected(userId: number): boolean {
    return this.selectedUserIds.includes(userId);
  }
  
  getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName} (${user.username})`;
    }
    if (user.firstName) {
      return `${user.firstName} (${user.username})`;
    }
    return user.username;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showTaskDetailsModal = false;
    this.selectedTask = null;
  }

  openTaskDetailsModal(task: Task): void {
    this.selectedTask = task;
    this.isEditingInDetails = false;
    // Cargar los valores del formulario
    this.taskTitle = task.title;
    this.taskDescription = task.description || '';
    this.taskCategory = task.category || '';
    this.taskDueDate = task.dueDate || '';
    this.showTaskDetailsModal = true;
  }

  closeTaskDetailsModal(): void {
    if (this.isEditingInDetails) {
      // Si está editando, cancelar cambios
      if (this.selectedTask) {
        this.taskTitle = this.selectedTask.title;
        this.taskDescription = this.selectedTask.description || '';
        this.taskCategory = this.selectedTask.category || '';
        this.taskDueDate = this.selectedTask.dueDate || '';
      }
    }
    this.showTaskDetailsModal = false;
    this.isEditingInDetails = false;
    this.selectedTask = null;
    // Limpiar formulario
    this.taskTitle = '';
    this.taskDescription = '';
    this.taskCategory = '';
    this.taskDueDate = '';
  }

  isTaskAssignedToMe(task: Task): boolean {
    if (!this.currentUser || !task) {
      return false;
    }
    const currentUserId = this.currentUser.id;
    
    // Verificar si la tarea fue asignada al usuario actual (no creada por él)
    if (task.createdBy !== currentUserId) {
      // Verificar si está en la lista de usuarios asignados
      if (task.assignedUsers && task.assignedUsers.includes(currentUserId)) {
        return true;
      }
      // Verificar el campo assignedTo (compatibilidad)
      if (task.assignedTo === currentUserId) {
        return true;
      }
    }
    return false;
  }

  isTaskOwner(): boolean {
    return this.selectedTask && this.currentUser && 
           this.selectedTask.createdBy === this.currentUser.id;
  }

  toggleEditInDetails(): void {
    if (this.isEditingInDetails) {
      // Guardar cambios
      this.saveTaskFromDetails();
    } else {
      // Activar modo edición
      if (this.selectedTask) {
        this.taskTitle = this.selectedTask.title;
        this.taskDescription = this.selectedTask.description || '';
        this.taskCategory = this.selectedTask.category || '';
        this.taskDueDate = this.selectedTask.dueDate || '';
        // Inicializar usuarios asignados
        this.selectedUserIds = this.selectedTask.assignedUsers ? [...this.selectedTask.assignedUsers] : [];
        // Cargar usuarios disponibles si no están cargados
        if (this.availableUsers.length === 0) {
          this.loadUsers();
        }
      }
      this.isEditingInDetails = true;
    }
  }

  cancelEditInDetails(): void {
    if (this.selectedTask) {
      this.taskTitle = this.selectedTask.title;
      this.taskDescription = this.selectedTask.description || '';
      this.taskCategory = this.selectedTask.category || '';
      this.taskDueDate = this.selectedTask.dueDate || '';
      // Restaurar usuarios asignados
      this.selectedUserIds = this.selectedTask.assignedUsers ? [...this.selectedTask.assignedUsers] : [];
    }
    this.isEditingInDetails = false;
  }

  saveTaskFromDetails(): void {
    if (!this.selectedTask || !this.taskTitle.trim()) {
      return;
    }

    const updatedTask: any = {
      title: this.taskTitle,
      description: this.taskDescription,
      category: this.taskCategory || undefined,
      dueDate: this.taskDueDate || undefined
    };

    // Incluir usuarios asignados
    if (this.selectedUserIds.length > 0) {
      updatedTask.assignedUsers = this.selectedUserIds;
    } else {
      updatedTask.assignedUsers = [];
    }

    this.taskService.updateTask(this.selectedTask.id!, updatedTask).subscribe({
      next: () => {
        this.toastr.success('Tarea actualizada correctamente', 'Éxito');
        this.loadTasks();
        this.isEditingInDetails = false;
        // Recargar la tarea actualizada
        this.taskService.getTask(this.selectedTask!.id!).subscribe({
          next: (task) => {
            this.selectedTask = task;
            // Actualizar selectedUserIds con los nuevos valores
            this.selectedUserIds = task.assignedUsers ? [...task.assignedUsers] : [];
          }
        });
      },
      error: (err) => {
        console.error('Error al actualizar tarea', err);
        this.toastr.error('Error al actualizar la tarea', 'Error');
      }
    });
  }

  openCreateListModal(): void {
    this.listName = '';
    this.showCreateListModal = true;
  }

  closeCreateListModal(): void {
    this.showCreateListModal = false;
    this.listName = '';
  }

  createList(): void {
    if (!this.listName.trim()) {
      return;
    }

    const listName = this.listName.trim();
    
    // Agregar la lista al conjunto de listas creadas (sin crear tarea placeholder)
    this.createdLists.add(listName);
    this.saveCreatedLists();
    
    // Inicializar la categoría como visible
    if (this.visibleCategories[listName] === undefined) {
      this.visibleCategories[listName] = true;
    }
    
    // Actualizar las categorías para que aparezca la nueva lista
    this.updateCategories();
    
    this.toastr.success(`Lista "${listName}" creada correctamente`, 'Éxito');
    this.closeCreateListModal();
  }

  openEditModal(task: Task): void {
    this.selectedTask = task;
    this.taskTitle = task.title;
    this.taskDescription = task.description || '';
    this.taskAssignedTo = task.assignedTo || null;
    this.taskCategory = task.category || '';
    this.taskDueDate = task.dueDate || '';
    this.showEditModal = true;
  }

  createTask(): void {
    if (!this.taskTitle.trim()) {
      this.toastr.warning('El título es obligatorio', 'Campos requeridos');
      return;
    }
    
    if (!this.taskDueDate) {
      this.toastr.warning('La fecha de entrega es obligatoria', 'Campos requeridos');
      return;
    }
    
    // Verificar que hay token
    const token = this.authService.getToken();
    if (!token) {
      this.toastr.error('No estás autenticado. Por favor, inicia sesión nuevamente', 'Error de autenticación');
      this.router.navigate(['/login']);
      return;
    }

    const newTask: any = {
      title: this.taskTitle,
      description: this.taskDescription || '',
      status: TaskStatus.PENDING,
      category: this.taskCategory || undefined,
      dueDate: this.taskDueDate || null // Enviar null si no hay fecha
    };
    
    // Agregar lista de usuarios asignados si hay seleccionados
    if (this.selectedUserIds.length > 0) {
      newTask.assignedUsers = this.selectedUserIds;
    }
    
    console.log('Enviando tarea:', newTask);
    console.log('Token disponible:', !!token);

    this.taskService.createTask(newTask).subscribe({
      next: () => {
        this.toastr.success('Tarea creada correctamente', 'Éxito');
        this.loadTasks();
        this.closeCreateModal();
        this.taskCategory = '';
        this.taskDueDate = '';
        this.selectedUserIds = [];
      },
      error: (err) => {
        console.error('Error completo al crear tarea:', err);
        console.error('Status:', err.status);
        console.error('Error body:', err.error);
        
        let errorMessage = 'Error al crear la tarea';
        if (err.status === 403) {
          errorMessage = 'No tienes permisos para crear tareas. Verifica tu sesión.';
        } else if (err.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          this.authService.logout();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error) {
          errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
        }
        
        this.toastr.error(errorMessage, 'Error');
      }
    });
  }

  updateTask(): void {
    if (!this.selectedTask || !this.taskTitle.trim()) {
      return;
    }

    const updatedTask: Partial<Task> = {
      title: this.taskTitle,
      description: this.taskDescription,
      assignedTo: this.taskAssignedTo || undefined,
      category: this.taskCategory || undefined,
      dueDate: this.taskDueDate || undefined
    };

    this.taskService.updateTask(this.selectedTask.id!, updatedTask).subscribe({
      next: () => {
        this.loadTasks();
        this.closeCreateModal();
        this.taskCategory = '';
        this.taskDueDate = '';
      },
      error: (err) => {
        console.error('Error al actualizar tarea', err);
      }
    });
  }

  updateTaskStatus(task: Task, newStatus: string): void {
    const status = newStatus as TaskStatus;
    const updateData: Partial<Task> = { status };
    
    if (status === TaskStatus.COMPLETED && !task.completedAt) {
      updateData.completedAt = new Date().toISOString();
    }
    
    this.taskService.updateTask(task.id!, updateData).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error al actualizar estado', err);
      }
    });
  }

  toggleTaskComplete(task: Task): void {
    const newStatus = task.status === TaskStatus.COMPLETED 
      ? TaskStatus.PENDING 
      : TaskStatus.COMPLETED;
    this.updateTaskStatus(task, newStatus);
  }

  deleteTask(task: Task): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      this.taskService.deleteTask(task.id!).subscribe({
        next: () => {
          this.loadTasks();
        },
        error: (err) => {
          console.error('Error al eliminar tarea', err);
        }
      });
    }
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
    this.toastr.success('Sesión cerrada correctamente', 'Cierre de sesión exitoso');
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 500);
  }

  getStatusClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'status-pending';
      case TaskStatus.IN_PROGRESS:
        return 'status-in-progress';
      case TaskStatus.COMPLETED:
        return 'status-completed';
      case TaskStatus.CANCELLED:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'Pendiente';
      case TaskStatus.IN_PROGRESS:
        return 'En Progreso';
      case TaskStatus.COMPLETED:
        return 'Completada';
      case TaskStatus.CANCELLED:
        return 'Cancelada';
      default:
        return status;
    }
  }

  formatNotificationTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}, ${hours}:${minutes}`;
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  updateCurrentDate(): void {
    const now = new Date();
    this.currentDay = now.getDate();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    this.currentMonth = months[now.getMonth()];
  }

  toggleCategoryMenu(category: string, event: Event): void {
    event.stopPropagation();
    this.openMenuCategory = this.openMenuCategory === category ? null : category;
  }

  closeCategoryMenu(): void {
    this.openMenuCategory = null;
  }

  deleteCategory(category: string): void {
    this.closeCategoryMenu();
    
    const tasksInCategory = this.tasksByCategory[category] || [];
    
    if (tasksInCategory.length === 0) {
      // Si no hay tareas, solo eliminar la lista del registro
      this.createdLists.delete(category);
      this.saveCreatedLists();
      this.updateCategories();
      return;
    }

    // Eliminar todas las tareas de la categoría
    const deletePromises = tasksInCategory.map(task => 
      firstValueFrom(this.taskService.deleteTask(task.id!))
    );

    Promise.all(deletePromises).then(() => {
      // Eliminar la lista del registro si era una lista creada explícitamente
      this.createdLists.delete(category);
      this.saveCreatedLists();
      this.loadTasks();
    }).catch((err) => {
      console.error('Error al eliminar tareas de la categoría', err);
    });
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  getInitials(): string {
    if (!this.currentUser) {
      return 'U';
    }
    
    // Priorizar firstName y lastName si están disponibles
    if (this.currentUser.firstName && this.currentUser.lastName) {
      const firstInitial = this.currentUser.firstName.trim().charAt(0).toUpperCase();
      const lastInitial = this.currentUser.lastName.trim().charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
    
    // Si solo hay firstName
    if (this.currentUser.firstName) {
      const firstName = this.currentUser.firstName.trim();
      if (firstName.length >= 2) {
        return firstName.substring(0, 2).toUpperCase();
      }
      return firstName.charAt(0).toUpperCase();
    }
    
    // Fallback al username si no hay firstName/lastName
    if (this.currentUser.username) {
      const username = this.currentUser.username.trim();
      
      // Si el username tiene espacios, tomar las primeras letras de cada palabra
      const parts = username.split(' ');
      if (parts.length > 1) {
        // Tomar la primera letra de la primera y última palabra
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      
      // Si es un solo nombre, tomar las primeras dos letras
      if (username.length >= 2) {
        return username.substring(0, 2).toUpperCase();
      }
      
      // Si solo tiene una letra, usar esa letra
      return username.charAt(0).toUpperCase();
    }
    
    return 'U';
  }

  getFullName(): string {
    if (!this.currentUser) {
      return 'Usuario';
    }
    
    // Si hay firstName y lastName, combinarlos
    if (this.currentUser.firstName && this.currentUser.lastName) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    
    // Si solo hay firstName
    if (this.currentUser.firstName) {
      return this.currentUser.firstName;
    }
    
    // Fallback al username
    return this.currentUser.username || 'Usuario';
  }

  // Métodos para manejar listas creadas
  private loadCreatedLists(): void {
    try {
      const userId = this.authService.getCurrentUser()?.id;
      if (userId) {
        const saved = localStorage.getItem(`createdLists_${userId}`);
        if (saved) {
          const lists = JSON.parse(saved);
          this.createdLists = new Set(lists);
        }
      }
    } catch (err) {
      console.error('Error al cargar listas creadas:', err);
    }
  }

  private saveCreatedLists(): void {
    try {
      const userId = this.authService.getCurrentUser()?.id;
      if (userId) {
        const lists = Array.from(this.createdLists);
        localStorage.setItem(`createdLists_${userId}`, JSON.stringify(lists));
      }
    } catch (err) {
      console.error('Error al guardar listas creadas:', err);
    }
  }

  private updateCategories(): void {
    // Forzar actualización de categorías
    this.applyFilter();
  }

  // Métodos para manejar notificaciones
  private handleNotification(notification: any): void {
    if (!this.currentUser) return;

    // Solo procesar notificaciones de tareas asignadas
    if (notification.type === 'task_assigned' && notification.task) {
      const task = notification.task as Task;
      
      // Verificar si la tarea fue asignada al usuario actual
      const isAssignedToMe = task.assignedUsers?.includes(this.currentUser.id) || 
                             task.assignedTo === this.currentUser.id;
      
      if (isAssignedToMe && task.createdBy !== this.currentUser.id) {
        // Agregar notificación
        const notificationId = Date.now();
        this.notifications.unshift({
          id: notificationId,
          task: task,
          type: notification.type,
          timestamp: new Date(),
          read: false
        });
        
        this.updateUnreadCount();
        this.toastr.info(`Te asignaron la tarea: ${task.title}`, 'Nueva tarea asignada');
      }
    }
    
    // Recargar tareas para sincronizar
    this.loadTasks();
  }

  private loadAssignedTasksNotifications(): void {
    if (!this.currentUser) return;
    
    // Cargar tareas y crear notificaciones para las asignadas
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        const assignedTasks = tasks.filter(task => 
          (task.assignedUsers?.includes(this.currentUser!.id) || 
           task.assignedTo === this.currentUser!.id) &&
          task.createdBy !== this.currentUser!.id
        );
        
        // Crear notificaciones para tareas asignadas que aún no están en la lista
        assignedTasks.forEach(task => {
          const exists = this.notifications.some(n => n.task.id === task.id);
          if (!exists) {
            this.notifications.push({
              id: Date.now() + Math.random(),
              task: task,
              type: 'task_assigned',
              timestamp: task.createdAt ? new Date(task.createdAt) : new Date(),
              read: false
            });
          }
        });
        
        this.updateUnreadCount();
      }
    });
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      // Marcar todas como leídas al abrir
      this.markAllAsRead();
    }
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  markAsRead(notificationId: number): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.updateUnreadCount();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  openTaskFromNotification(task: Task): void {
    this.closeNotifications();
    this.openTaskDetailsModal(task);
    // Marcar como leída
    const notification = this.notifications.find(n => n.task.id === task.id);
    if (notification) {
      this.markAsRead(notification.id);
    }
  }

  clearNotification(notificationId: number, event: Event): void {
    event.stopPropagation();
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateUnreadCount();
  }
}

