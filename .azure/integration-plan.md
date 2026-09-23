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
- MongoDB is provided by the `mongodb` Compose service and is configurable through
	`MONGODB_URI` and `MONGODB_DB`. Quiz sessions are stored in the Mongo projection;
	LangGraph checkpoints are also stored in Mongo and are authoritative for workflow
	resume by `thread_id`.
- Markdown ingestion is restricted by `MARKDOWN_ALLOWED_HOSTS` and bounded by
	`MARKDOWN_MAX_BYTES` and `MARKDOWN_TIMEOUT_MS`.
- Quiz generation uses `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
	`OPENAI_TIMEOUT_MS`, `OPENAI_MAX_TOKENS`, and bounded `QUIZ_GENERATION_RETRIES`.

## Shared Types
- None. No shared package or import alias.

## Services
- No Azure-managed services.
- Essential: NestJS API, MongoDB, and Vite React frontend.
- Enhancement: the REST start contract accepts `sourceUrl` and `topic`; the API
	fetches Markdown, generates a structured quiz through LangGraph/LangChain, and
	projects it to Mongo without returning answer keys.

## Dependency Storage
- `api_node_modules` and `frontend_node_modules` are named Docker volumes shared by `workspace` and runtime services; do not install dependencies on the host.
