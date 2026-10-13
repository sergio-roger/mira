# Mira — Diseño del backend (v1)

Fecha: 2026-10-13

Mira es una herramienta de gestión de tareas y actividades inspirada en [Plane](https://github.com/makeplane/plane). Este documento define el backend de la primera etapa. El frontend se diseña y construye después, cuando el backend esté completo.

## 1. Alcance y decisiones

### Decisiones acordadas

| Tema | Decisión |
|---|---|
| Base de datos | PostgreSQL con Prisma |
| Nivel superior | Solo **workspace** (sin organización encima), como Plane |
| Autenticación | Email y contraseña, con JWT |
| Roles | `ADMIN` y `MEMBER`, a nivel de workspace |
| Alta de miembros | Un Admin agrega por email a un usuario ya registrado (sin correos) |
| Tareas | Completas, excepto adjuntos |
| Seguimiento | Cycles y analítica básica |
| Orden de entrega | Primero todo el backend, después el frontend |

### Incluido

- Autenticación, usuarios, workspaces y miembros.
- Proyectos, estados (con grupo) y etiquetas.
- Tareas: base, etiquetas, subtareas, relaciones, estimaciones, comentarios, historial de actividad y suscriptores.
- Cycles y analítica básica.

### Fuera de alcance (etapas futuras)

Modules, vistas guardadas, adjuntos, invitaciones por correo, OAuth, páginas, intake, notificaciones, permisos por proyecto, roles `GUEST`, escala de estimaciones configurable.

## 2. Arquitectura

Arquitectura hexagonal por módulos, según `CLAUDE.md`. El dominio no importa NestJS ni Prisma.

| Módulo | Responsabilidad |
|---|---|
| `auth` | Registro, login, refresco de token y logout |
| `users` | Perfil del usuario |
| `workspaces` | Workspaces, membresías y roles |
| `projects` | Proyectos, identificador corto, estados y etiquetas |
| `issues` | Tareas, subtareas, relaciones, comentarios, historial y suscriptores |
| `cycles` | Sprints y traspaso de tareas pendientes |
| `analytics` | Conteos por estado, prioridad y asignado; avance de un ciclo |

Decisiones técnicas:

- **Prisma y el dominio:** cada repositorio de `infrastructure/database/` traduce entre el modelo de Prisma y la entidad de dominio. Los casos de uso dependen solo de la interfaz definida en `domain/repositories/`.
- **Contraseñas:** hash con argon2.
- **Tokens:** acceso de vida corta (15 min) y refresco de vida larga, guardado como hash en la base de datos para poder revocarlo.
- **Validación de entrada:** `class-validator` en los DTOs.
- **Autorización:** un guard comprueba que el usuario es miembro del workspace y tiene el rol necesario.
- **Identificador legible de tareas:** `<IDENTIFICADOR_PROYECTO>-<número>`, con un contador por proyecto.
- **Errores:** los errores de dominio (clases base en `shared/domain/`) se traducen a HTTP en un filtro de excepciones en `shared/infrastructure/`.

## 3. Modelo de datos

### Identidad y workspaces

- `User`: id, email (único), nombre, passwordHash, createdAt.
- `RefreshToken`: id, userId, tokenHash, expiresAt, revokedAt.
- `Workspace`: id, nombre, slug (único), ownerId.
- `WorkspaceMember`: workspaceId, userId, rol (`ADMIN` | `MEMBER`). Clave: (workspaceId, userId).

### Proyectos

- `Project`: id, workspaceId, nombre, descripción, identifier (por ejemplo `MIRA`, único dentro del workspace), issueCounter, archivedAt.
- `State`: id, projectId, nombre, grupo (`BACKLOG` | `UNSTARTED` | `STARTED` | `COMPLETED` | `CANCELLED`), color, orden.
- `Label`: id, projectId, nombre, color.

Al crear un proyecto se generan estados por defecto: Backlog, Todo, In Progress, Done y Cancelled.

### Tareas

- `Issue`: id, projectId, sequenceId, título, descripción, stateId, prioridad (`NONE` | `URGENT` | `HIGH` | `MEDIUM` | `LOW`), startDate, dueDate, estimate (puntos), parentId (opcional), cycleId (opcional), creatorId, orden en el tablero. Único: (projectId, sequenceId).
- `IssueAssignee`: issueId, userId (varios asignados por tarea).
- `IssueLabel`: issueId, labelId.
- `IssueRelation`: issueId, relatedIssueId, tipo (`BLOCKS` | `DUPLICATES` | `RELATES_TO`). Se guarda en un solo sentido; la API devuelve ambos.
- `IssueComment`: id, issueId, authorId, contenido, createdAt, editedAt.
- `IssueSubscriber`: issueId, userId.
- `IssueActivity`: id, issueId, actorId, campo, valor anterior, valor nuevo, createdAt. Se registra en cada cambio de una tarea.

### Cycles

- `Cycle`: id, projectId, nombre, descripción, startDate, endDate.

### Reglas de integridad

- Una tarea y su subtarea pertenecen al mismo proyecto, y no puede haber ciclos de parentesco.
- Los asignados deben ser miembros del workspace.
- Una tarea solo puede estar en un ciclo de su mismo proyecto.
- Un workspace siempre tiene al menos un Admin; no se puede quitar al último ni dejar el workspace sin owner.
- La estimación es un número de puntos libre.

## 4. API REST

Prefijo `/api`. Excepto `auth`, todas las rutas requieren token de acceso. Las rutas de proyectos, tareas y ciclos van anidadas bajo el workspace (`:ws`) y el guard comprueba la pertenencia.

### Auth y perfil

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /users/me`, `PATCH /users/me`

### Workspaces

- `POST /workspaces`, `GET /workspaces`
- `GET /workspaces/:ws`, `PATCH /workspaces/:ws` (Admin), `DELETE /workspaces/:ws` (solo owner)
- `GET /workspaces/:ws/members`
- `POST /workspaces/:ws/members` (Admin, recibe email)
- `PATCH` y `DELETE /workspaces/:ws/members/:userId` (Admin)

### Proyectos, estados y etiquetas

- `POST` y `GET /workspaces/:ws/projects`
- `GET`, `PATCH` y `DELETE /workspaces/:ws/projects/:id` (`DELETE` archiva)
- CRUD de `.../projects/:id/states` y `.../projects/:id/labels`

### Tareas

- `POST` y `GET /projects/:id/issues`, con filtros por estado, prioridad, asignado, etiqueta, ciclo y texto, orden y paginación
- `GET`, `PATCH` y `DELETE .../issues/:issueId` (el `GET` acepta también el identificador legible, por ejemplo `MIRA-12`)
- `PATCH .../issues/:issueId/move` (cambio de estado y reordenación en el kanban)
- `GET` y `POST .../issues/:issueId/comments`; `PATCH` y `DELETE` de cada comentario (solo el autor)
- `GET .../issues/:issueId/activity`
- `POST` y `DELETE .../issues/:issueId/relations`
- `POST` y `DELETE .../issues/:issueId/subscribers`
- `GET .../issues/:issueId/sub-issues`

### Cycles y analítica

- CRUD de `.../projects/:id/cycles`
- `POST .../cycles/:cycleId/issues` y `DELETE .../cycles/:cycleId/issues/:issueId`
- `POST .../cycles/:cycleId/transfer` (pasa las tareas pendientes a otro ciclo)
- `GET .../projects/:id/analytics` (conteos por estado, prioridad y asignado)
- `GET .../cycles/:cycleId/progress` (total, completado y pendiente por grupo de estado)

### Errores

Respuestas JSON uniformes. 400 validación, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto (por ejemplo email repetido). A quien no es miembro de un workspace se le responde 404, para no revelar su existencia.

### Seguridad básica

Validación estricta de DTOs, límite de intentos en login, CORS limitado al frontend. Variables nuevas en `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`.

## 5. Estrategia de pruebas

Vitest, ya configurado en el backend.

- **Unitarias (dominio y casos de uso):** cada caso de uso se prueba con repositorios en memoria que implementan el puerto. Cubren las reglas de integridad de la sección 3 y los permisos por rol. No requieren base de datos.
- **E2E (infraestructura):** `test:e2e` con supertest contra una base PostgreSQL de pruebas. Cubren el flujo completo de cada módulo y la traducción de errores a HTTP.
- **Criterio por parte:** una parte se considera terminada cuando sus pruebas unitarias y e2e pasan, y `yarn build` y `yarn lint` no dan errores.

## 6. Orden de implementación (por partes)

Cada parte se implementa con sus pruebas antes de pasar a la siguiente. Cada una parte de la anterior y se verifica sola.

1. **Cimientos:** Prisma y conexión a PostgreSQL, `.env.example`, clases base de errores, filtro de excepciones, validación global, prefijo `/api`, y refactor de `app.module.ts` hacia la estructura por módulos.
2. **`users` y `auth`:** registro, login, refresco, logout y guard JWT.
3. **`workspaces`:** workspaces, miembros, roles y el guard de pertenencia y rol.
4. **`projects`:** proyectos, estados por defecto, estados y etiquetas.
5. **`issues` (núcleo):** crear, listar con filtros, editar, mover, identificador legible y asignados.
6. **`issues` (extensiones):** etiquetas, subtareas, relaciones, estimaciones, comentarios, suscriptores e historial de actividad.
7. **`cycles`:** CRUD, asignación de tareas y traspaso.
8. **`analytics`:** analítica del proyecto y progreso de ciclo.

## 7. Pendiente para después del backend

El frontend (React + Vite + Tailwind, sobre la plantilla TailAdmin) tendrá su propio diseño: login, selector de workspace, listado y kanban de tareas, detalle de tarea, ciclos y analítica. Se diseña cuando el backend esté completo.
