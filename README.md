# Mira

Aplicación de gestión de actividades. Monorepo con un backend en NestJS y un frontend en React.

## Estructura

```
gestion-actividades/
├── backend/     # API en NestJS (arquitectura hexagonal por módulos)
├── frontend/    # Interfaz en React + Vite + Tailwind CSS (plantilla TailAdmin)
├── CLAUDE.md    # Reglas y convenciones de trabajo del proyecto
└── README.md
```

## Requisitos

- [Node.js](https://nodejs.org/) 22 o superior
- [Yarn](https://yarnpkg.com/) 1.x (`npm i -g yarn`)

Ambos proyectos usan **yarn**; no usar `npm install`.

## Puesta en marcha

Instalar dependencias y levantar cada servicio en su propia terminal.

### Backend

```powershell
cd backend
Copy-Item .env.example .env
yarn install
yarn start:dev
```

Queda disponible en http://localhost:3088.

### Frontend

```powershell
cd frontend
yarn install
yarn dev
```

Queda disponible en http://localhost:5173.

## Puertos

| Servicio | Puerto | Configuración |
|---|---|---|
| Backend | 3088 | Variable `PORT` en `backend/.env` |
| Frontend | 5173 | Valor por defecto de Vite |

## Variables de entorno

El archivo `backend/.env` no se versiona. Copia `backend/.env.example` y ajusta los valores:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del servidor HTTP | `3088` |

## Scripts

### Backend (`backend/`)

| Comando | Descripción |
|---|---|
| `yarn start:dev` | Servidor en modo desarrollo con recarga automática |
| `yarn start` | Servidor sin recarga |
| `yarn build` | Compila a `dist/` |
| `yarn start:prod` | Ejecuta la versión compilada |
| `yarn lint` | Análisis estático con oxlint |
| `yarn test` | Pruebas unitarias (Vitest) |
| `yarn test:e2e` | Pruebas end-to-end |
| `yarn test:cov` | Pruebas con cobertura |

### Frontend (`frontend/`)

| Comando | Descripción |
|---|---|
| `yarn dev` | Servidor de desarrollo de Vite |
| `yarn build` | Verifica tipos y genera el build de producción |
| `yarn preview` | Sirve el build de producción localmente |
| `yarn lint` | Análisis estático con ESLint |

## Arquitectura

- **Backend:** arquitectura hexagonal organizada por módulos de dominio (`domain`, `application`, `infrastructure`). NestJS actúa como capa de infraestructura.
- **Frontend:** organización por dominio en `features/`, con componentes compartidos, hooks, proveedores y utilidades globales.

El detalle de ambas estructuras y las reglas de dependencias está en [CLAUDE.md](CLAUDE.md).

## Contribuir

- Los mensajes de commit van en inglés, con asunto corto en modo imperativo (por ejemplo, `Add activity module`).
- Cualquier variable de entorno nueva debe agregarse también a `.env.example`.

## Licencia

El frontend parte de la plantilla TailAdmin React, publicada bajo licencia MIT. Ver [frontend/LICENSE.md](frontend/LICENSE.md).
