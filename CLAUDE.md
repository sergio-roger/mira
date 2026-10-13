# CLAUDE.md — Mira

Reglas para trabajar en este proyecto. Mantener este archivo actualizado cuando se acuerden reglas nuevas.

## Proyecto

- **Nombre:** Mira (gestión de actividades). Monorepo con git en la raíz (rama `main`).
- `backend/` — NestJS (paquete `mira-backend`).
- `frontend/` — React + Vite + Tailwind, basado en la plantilla TailAdmin (paquete `mira-frontend`). Ver también `frontend/AGENTS.md`.

## Gestor de paquetes

- Usar **yarn** en ambos proyectos (nunca `npm install`; no generar `package-lock.json`).
- Dependencias y scripts viven en cada `package.json`; versiones exactas en `yarn.lock`.

## Comandos y puertos

| Servicio | Comando (desde su carpeta) | Puerto |
|---|---|---|
| Backend | `yarn start:dev` | 3088 (variable `PORT` en `backend/.env`) |
| Frontend | `yarn dev` | 5173 (por defecto de Vite) |

- Verificar cambios con `yarn build` en el proyecto afectado; `yarn lint` si aplica.
- El backend carga `.env` con `process.loadEnvFile` en `src/main.ts` (no se usa `@nestjs/config`).

## Variables de entorno

- `.env` no se versiona. Cualquier variable nueva debe agregarse también a `.env.example`.

## Git

- No hacer commit, push ni cambios de historial salvo que el usuario lo pida explícitamente.
- Mensajes de commit **en inglés** y siguiendo el estándar de git: línea de asunto corta en modo imperativo (p. ej. `Add activity module`), y cuerpo opcional separado por una línea en blanco explicando el porqué.
- **Nunca** mencionar coautor, Claude ni ningún LLM en commits ni en descripciones de PR (sin `Co-Authored-By`, sin "Generated with…").

## Arquitectura del frontend (`frontend/src`)

Organización por dominio (features). El proyecto usa Vite + React Router, no Next.js, por lo que `app/` agrupa solo el enrutamiento y los layouts.

```
src/
├── app/                  # Enrutamiento y layouts (React Router)
├── components/           # Componentes UI globales, sin lógica de negocio
│   └── ui/               # Botones, modales, inputs
├── config/               # Variables de entorno y constantes globales
├── features/             # Núcleo de la aplicación, agrupado por dominio
│   └── <dominio>/        # Ej.: auth, activities
│       ├── api/          # Consultas a la API específicas del módulo
│       ├── components/   # Componentes exclusivos del módulo
│       ├── hooks/        # Hooks de estado local del módulo
│       ├── types/        # Tipos e interfaces TypeScript del módulo
│       └── index.ts      # Barril: exporta SOLO lo que el resto de la app puede usar
├── hooks/                # Hooks compartidos globalmente (useTheme, useDebounce)
├── lib/                  # Inicialización de librerías externas (instancia de axios, etc.)
├── providers/            # Proveedores de contexto global
├── stores/               # Estado global de la aplicación
└── utils/                # Funciones utilitarias puras
```

Reglas:
- Todo código nuevo con lógica de negocio va en `features/<dominio>/`, no en `components/` ni `pages/`.
- Un feature solo se importa desde otro a través de su `index.ts`; no importar archivos internos de otro módulo.
- `components/` y `components/ui/` no contienen lógica de negocio ni llamadas a la API.
- Las llamadas a la API van en `features/<dominio>/api/`, usando la instancia de `lib/`.
- La plantilla actual (`layout/`, `pages/`, etc.) se migra a esta estructura de forma gradual, solo cuando se toca cada parte; no reorganizar todo de golpe.

## Arquitectura del backend (`backend/src`)

Arquitectura hexagonal (puertos y adaptadores) organizada por módulos de dominio. NestJS actúa como capa de infraestructura; el dominio no depende de él.

```
src/
├── modules/                         # Divisiones por dominio de negocio
│   └── <modulo>/                    # Ej.: users, activities
│       ├── domain/                  # Núcleo, independiente de frameworks y librerías
│       │   ├── models/              # Entidades puras (user.entity.ts)
│       │   ├── value-objects/       # Validaciones nativas (user-email.vo.ts)
│       │   └── repositories/        # PUERTOS: interfaces de las operaciones permitidas
│       │       └── user.repository.ts
│       ├── application/             # Casos de uso: orquestan la lógica de negocio
│       │   ├── use-cases/           # register-user, update-profile, etc.
│       │   └── dtos/                # DTOs para validar la entrada de datos
│       └── infrastructure/          # ADAPTADORES: implementaciones tecnológicas
│           ├── controllers/         # Controladores HTTP (NestJS)
│           ├── database/            # Implementación real de la BD
│           │   └── <orm>-user.repository.ts   # Implementa el puerto de domain/repositories
│           └── services/            # Clientes externos (emails, pagos)
├── shared/                          # Código compartido entre módulos
│   ├── domain/                      # Clases base, errores personalizados globales
│   └── infrastructure/              # Logger, middlewares y utilidades compartidas
└── main.ts                          # Punto de entrada (bootstrapping)
```

Reglas:
- Dependencias hacia adentro: `infrastructure` → `application` → `domain`. Nunca al revés.
- `domain/` no importa nada de NestJS, ORM ni librerías externas; solo TypeScript puro.
- Los repositorios se definen como interfaces en `domain/repositories/` y se implementan en `infrastructure/database/`; los casos de uso dependen de la interfaz, no de la implementación.
- Cada caso de uso es una clase con una única responsabilidad, en `application/use-cases/`.
- Los controladores solo traducen HTTP ↔ casos de uso; no contienen lógica de negocio.
- Un módulo no importa archivos internos de otro; se comunican a través de casos de uso o interfaces expuestas.
- Los nombres de archivo van en kebab-case con sufijo de rol (`.entity.ts`, `.vo.ts`, `.repository.ts`, `.controller.ts`).
- Cada módulo se registra con su propio `*.module.ts` de NestJS en `infrastructure/`, enlazando puertos con adaptadores.
- El `app.module.ts` actual de la plantilla se refactoriza hacia esta estructura al crear el primer módulo.

## Código limpio y principios SOLID

Todo el código nuevo se escribe con enfoque en código limpio y principios SOLID:

- **S — Responsabilidad única:** cada clase, función y componente tiene un solo motivo para cambiar.
- **O — Abierto/cerrado:** extender el comportamiento añadiendo código nuevo, no modificando el existente.
- **L — Sustitución de Liskov:** las implementaciones deben poder reemplazar a su interfaz sin romper a quien las usa.
- **I — Segregación de interfaces:** interfaces pequeñas y específicas en lugar de interfaces grandes.
- **D — Inversión de dependencias:** depender de abstracciones (puertos), no de implementaciones concretas.

Prácticas de código limpio:
- Nombres claros y descriptivos que revelen la intención; evitar abreviaturas.
- Funciones cortas que hagan una sola cosa, con pocos parámetros.
- Sin duplicación (DRY) ni código muerto; sin números o textos "mágicos" (usar constantes con nombre).
- Preferir composición sobre herencia.
- Comentar solo el porqué cuando no sea evidente, no el qué; el código debe explicarse por sí mismo.
- Manejar errores de forma explícita; no silenciar excepciones.
- Tipado estricto en TypeScript: evitar `any`.

## Convenciones

- Seguir el estilo del código existente (nombres, comentarios, idioma de cada archivo).
- Cambios mínimos y enfocados: no refactorizar ni tocar archivos no relacionados con la tarea.
- Conservar `frontend/LICENSE.md` (licencia MIT de la plantilla).
- Antes de borrar o sobrescribir algo, revisar qué contiene y confirmar si no se pidió explícitamente.
