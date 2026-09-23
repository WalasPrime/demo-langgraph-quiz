# Integration Plan

## Backend
- Project: `apps/api`
- Install: `docker compose exec workspace npm i --prefix apps/api`
- Build: `docker compose exec workspace npm --prefix apps/api run build`
- Test: `docker compose exec workspace npm --prefix apps/api test`
- Runtime: `docker compose up api`
- Port: `3000`
- Health endpoint: `GET /api/health`

## Frontend
- Project: `apps/frontend`
- Install: `docker compose exec workspace npm i --prefix apps/frontend`
- Build: `docker compose exec workspace npm --prefix apps/frontend run build`
- Test: `docker compose exec workspace npm --prefix apps/frontend test`
- Dev: `docker compose up frontend`
- Port: `5173`
- API seam: `apps/frontend/src/api/index.ts`
- Mock client/data to replace or delete during integration: `apps/frontend/src/api/mockClient.ts`, `apps/frontend/src/api/previewState.ts`, `apps/frontend/src/mocks/data.ts`
- Mock state switcher: `PreviewSwitcher` in `apps/frontend/src/App.tsx`

## API Routes
- `GET /api/health` -> `{ status: "ok", service: "api" }` (200, 503)
- `GET /` -> frontend HTML shell (200)

## Database
- None. No migrations or seed data are required.

## Shared Types
- None. No shared package or import alias.

## Services
- None. No Azure-managed services.
- Essential: stateless NestJS API and Vite React frontend.
- Enhancement: none.

## Dependency Storage
- `api_node_modules` and `frontend_node_modules` are named Docker volumes shared by `workspace` and runtime services; do not install dependencies on the host.
