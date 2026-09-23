# Project Plan

**Status**: Awaiting Integration
**Created**: 2026-09-23
**Mode**: NEW

---

## 1. Project Overview

**Goal**: Build a lightweight Docker Compose application with a Vite React TypeScript frontend and a stateless NestJS TypeScript API. The project is designed so that every module is independently testable.

**App Type**: SPA + API

**API Login**: No

**Mode**: NEW

**Deployment Plan**: No deployment plan found

---

## 2. API — Backend

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Framework** | NestJS |
| **Runtime** | Node |
| **Package Manager** | npm |
| **Test Runner** | jest |
| **Mocking Library** | jest.mock |
| **Test Command** | npm test |
| **Orchestration** | docker-compose |
| **Exposure** | Direct host port 3000; no reverse proxy |

The API is stateless and exposes `GET /api/health` with a small status payload. No database, broker, cache, file store, authentication, or observability service is included in the initial baseline.

---

## 3. Frontend — Web App

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Framework** | React + Vite |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |
| **Orchestration** | docker-compose |
| **Exposure** | Direct host port 5173; no reverse proxy |

The frontend provides a lightweight React shell with a simple API health view and a clearly isolated placeholder for frontend-to-API wiring.

---

## 4. Services Required

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|------------|---------------------|----------------------|----------------|
| None | No managed Azure service is required for the stateless baseline | — | — | Not required |

Local development uses Docker Compose only. The Compose file contains a lightweight `workspace` Node service for npm commands plus `frontend` and `api` services with direct port mappings. No Node.js or npm installation is required on the host, and there is no database, broker, reverse proxy, or observability container.

---

## 5. Prerequisites

### Run

| Tool | Service(s) | Installed | Version |
|------|-----------|-----------|---------|
| Docker Engine | * | ✅ | 29.8.1 |
| Docker Compose | * | ✅ | v5.5.1 |

### Debug

| Tool | Service(s) | Installed | Version |
|------|-----------|-----------|---------|
| Docker Engine | workspace, frontend, api | ✅ | 29.8.1 |
| Docker Compose | workspace, frontend, api | ✅ | v5.5.1 |
| Docker extension for Visual Studio Code | * | ❓ | Unknown; not scanned |
| ESLint extension for Visual Studio Code | frontend, api | ❓ | Unknown; not scanned |

Docker Engine and Docker Compose are the only required host tools. All npm commands run in the `workspace` container; service containers also install and run their own dependencies from their service-local manifests.

---

## 6. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: A compact service console with a crisp light surface, restrained blue actions, and amber health signals. Use shallow elevation, 6px control radii, and dense spacing so the health state is scannable without feeling like a generic dashboard.
**Typography**: Segoe UI Variable, Segoe UI, sans-serif

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1769AA` | API actions, active navigation, and health refresh controls |
| `accent`  | `#D97706` | Health warnings and attention states |
| `surface` | `#F6F8FB` | Application canvas and service overview background |
| `text`    | `#172033` | Health labels, headings, and response details |
| `muted`   | `#667085` | Endpoint metadata, timestamps, and supporting copy |
| `border`  | `#D7DEE8` | Service boundaries, panels, and control outlines |

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Service Health | `/` | Show the API reachability state and the frontend-to-API wiring point for local development. | `header, nav, main, card-list, actions, footer` |

### Sample Content

Service Health — service:
| Service | Endpoint | Response | Status |
|---------|----------|----------|--------|
| API | `GET /api/health` | `{ status: "ok" }` | Operational |
| Frontend | `http://localhost:5173` | React shell loaded | Operational |
| API wiring | Browser fetch placeholder | Not connected yet | Pending |

---

## 7. Project Structure

```text
.
├── .azure/
│   ├── project-plan.md
│   └── requirements.json
├── apps/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       └── components/
│   └── api/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           └── health/
│               ├── health.controller.ts
│               └── health.service.ts
├── docs/
│   ├── specs/
│   │   └── local-development.md
│   └── adr/
│       ├── 001-docker-only-development.md
│       ├── 002-monorepo-layout.md
│       └── 003-stateless-baseline.md
└── docker-compose.yml
```

The root Compose file defines a barebones Node `workspace` image for manipulating the project directory and running npm commands, builds each application from its service-local Dockerfile, mounts source for development, and exposes frontend and API ports directly. Focused test and lint hooks live in each service package manifest; no shared workspace package manager is introduced.

---

## 8. Route Definitions

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|-------------|--------------|-------------|
| 1 | GET | `/api/health` | Return the API process health and service status. | — | `{ status: "ok", service: "api" }` | 200, 503 |
| 2 | GET | `/` | Serve the Vite frontend application. | — | HTML application shell | 200 |

---

## 9. Next Steps

1. Run **azure-project-scaffold** to execute this plan
2. Run **azure-project-integrate** to wire the frontend to live data, smoke-test the backend, and create the migrations
3. Run **azure-debug-plan** → **azure-debug-generate** for Docker emulators and VS Code debugging
4. Run the **azure-deploy** agent when ready; it uses **azure-app-onboard** for architecture, cost estimation, IaC generation, provisioning, and health verification
