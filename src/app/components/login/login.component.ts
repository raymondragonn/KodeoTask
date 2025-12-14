import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  username: string = '';
  password: string = '';
  error: string = '';
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
    if (!this.username || !this.password) {
      this.toastr.warning('Por favor, completa todos los campos', 'Campos incompletos');
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('¡Bienvenido! Sesión iniciada correctamente', 'Inicio de sesión exitoso');
          setTimeout(() => {
            this.router.navigate(['/tasks']);
          }, 500);
        } else {
          const errorMsg = response.error || response.message || 'Error al iniciar sesión';
          this.toastr.error(errorMsg, 'Error al iniciar sesión');
          this.error = errorMsg;
          this.loading = false;
        }
      },
      error: (err) => {
        const errorMessage = err.error?.error || err.error?.message || 'Error al conectar con el servidor';
        this.toastr.error(errorMessage, 'Error al iniciar sesión');
        this.error = errorMessage;
        this.loading = false;
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}

