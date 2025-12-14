import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit, OnDestroy {
  firstName: string = '';
  lastName: string = '';
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  error: string = '';
  success: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Deshabilitar scroll en body y html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    // Restaurar scroll cuando se destruye el componente
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  onSubmit(): void {
    if (!this.firstName || !this.lastName || !this.username || !this.email || !this.password) {
      this.toastr.warning('Por favor, completa todos los campos', 'Campos incompletos');
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.toastr.error('Las contraseñas no coinciden', 'Error de validación');
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    if (this.password.length < 6) {
      this.toastr.warning('La contraseña debe tener al menos 6 caracteres', 'Contraseña muy corta');
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.register(this.username, this.firstName, this.lastName, this.email, this.password).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Usuario registrado correctamente. Redirigiendo al login...', 'Registro exitoso');
          this.success = response.message || 'Usuario registrado correctamente. Redirigiendo...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          const errorMsg = response.message || response.error || 'Error al registrar usuario';
          this.toastr.error(errorMsg, 'Error al registrar');
          this.error = errorMsg;
          this.loading = false;
        }
      },
      error: (err) => {
        const errorMessage = err.error?.message || err.error?.error || 'Error al conectar con el servidor';
        this.toastr.error(errorMessage, 'Error al registrar');
        this.error = errorMessage;
        this.loading = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}

