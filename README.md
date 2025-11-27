# KodeoTask - Sistema de Gestión de Tareas Colaborativas

Aplicación de gestión de tareas colaborativas con arquitectura Cliente-Servidor que implementa RESTful API, comunicación TCP/UDP, multithreading y autenticación.

## Características

- ✅ **Arquitectura Cliente-Servidor**: Cliente Angular y Servidor Java
- ✅ **RESTful API**: POST, GET, PUT, DELETE para gestión de tareas
- ✅ **Sockets TCP**: Comunicación confiable para solicitudes REST
- ✅ **Sockets UDP**: Notificaciones en tiempo real
- ✅ **Multithreading**: Servidor maneja múltiples clientes concurrentemente
- ✅ **Autenticación**: Sistema de login/registro con tokens
- ✅ **Base de Datos**: SQLite para persistencia de datos

## Requisitos

- Java 17 o superior
- Maven 3.6+
- Node.js 18+ y npm
- Angular CLI 19+

## Instalación

### Servidor Java

1. Navega a la carpeta del servidor:
```bash
cd server
```

2. Compila el proyecto:
```bash
mvn clean compile
```

3. Ejecuta el servidor:
```bash
mvn exec:java -Dexec.mainClass="com.kodeotask.server.KodeoTaskServer"
```

El servidor se iniciará en:
- **TCP**: Puerto 8080 (para REST API)
- **UDP**: Puerto 8081 (para notificaciones)

### Cliente Angular

1. Instala las dependencias:
```bash
npm install
```

2. Inicia el servidor de desarrollo:
```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## Uso

1. **Registro**: Crea una nueva cuenta en `/register`
2. **Login**: Inicia sesión con tus credenciales en `/login`
3. **Gestión de Tareas**: 
   - Crea nuevas tareas
   - Actualiza el estado de las tareas
   - Asigna tareas a otros usuarios
   - Elimina tareas
   - Filtra por estado

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión

### Tareas
- `GET /api/tasks` - Obtener todas las tareas del usuario
- `GET /api/tasks/{id}` - Obtener una tarea específica
- `POST /api/tasks` - Crear nueva tarea
- `PUT /api/tasks/{id}` - Actualizar tarea
- `DELETE /api/tasks/{id}` - Eliminar tarea

**Nota**: Todas las rutas de tareas requieren autenticación mediante token Bearer.

## Estructura del Proyecto

```
KodeoTask/
├── server/                 # Servidor Java
│   ├── src/main/java/
│   │   └── com/kodeotask/
│   │       ├── model/      # Modelos de datos
│   │       ├── database/   # Gestión de BD
│   │       └── server/     # Servidores TCP/UDP y REST
│   └── pom.xml
└── src/                    # Cliente Angular
    └── app/
        ├── components/     # Componentes UI
        ├── services/      # Servicios de comunicación
        └── models/        # Modelos TypeScript
```

## Notificaciones UDP

El servidor envía notificaciones UDP cuando:
- Se crea una nueva tarea
- Se actualiza una tarea
- Se asigna una tarea a un usuario
- Se elimina una tarea

**Nota**: En navegadores web, UDP no está disponible directamente. El cliente Angular está preparado para usar WebSocket como alternativa para notificaciones en tiempo real.

## Base de Datos

La aplicación usa SQLite. El archivo `kodeotask.db` se crea automáticamente en la raíz del proyecto del servidor.

## Desarrollo

### Compilar el servidor
```bash
cd server
mvn clean package
```

### Ejecutar tests
```bash
# Servidor
cd server
mvn test

# Cliente
npm test
```

## Licencia

Este proyecto es de código abierto y está disponible para uso educativo.
