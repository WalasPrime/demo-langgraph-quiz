# Project Guidelines

## Current Status

The Docker Compose scaffold is implemented and smoke-tested. The NestJS API responds on `http://localhost:3000/api/health` and the Vite frontend serves on `http://localhost:5173`. LangSmith Cloud tracing is optional and is enabled through environment variables. The frontend still uses its mock API client; live API wiring is the next integration step.

See [the approved project plan](.azure/project-plan.md) and [the integration hand-off](.azure/integration-plan.md) for the current scope and remaining work.

## Architecture

- `apps/api`: stateless NestJS TypeScript API.
- `apps/frontend`: React + Vite TypeScript SPA using Fluent UI v9.
- `docker-compose.yml`: local orchestration with direct ports `3000` and `5173`.
- MongoDB stores quiz state and LangGraph checkpoints.
- LangSmith Cloud is optional external observability and is not part of the quiz domain API.

Dependencies must stay off the network-mounted checkout. `workspace` is the Node/npm command container, and the named `api_node_modules` and `frontend_node_modules` volumes are shared with the runtime containers.

## Build And Test

Run all Node/npm commands inside the workspace container; Node and npm are not host prerequisites:

```sh
docker compose up -d workspace
docker compose exec workspace npm i
docker compose exec workspace npm i --prefix apps/api
docker compose exec workspace npm i --prefix apps/frontend
docker compose exec workspace npm --prefix apps/api run build
docker compose exec workspace npm --prefix apps/api test
docker compose exec workspace npm --prefix apps/frontend run build
docker compose exec workspace npm --prefix apps/frontend test
```

Run the application with `docker compose up -d` and verify `GET /api/health` with `curl`.

## Conventions

- Keep the frontend API boundary in `apps/frontend/src/api/index.ts`.
- Keep preview-only loading, error, empty, and data states behind the existing preview state mechanism until integration replaces the mock client.
- Preserve the direct Compose port mappings and named dependency volumes.
- Update the relevant ADR and `.azure` hand-off artifact when the development workflow or integration status changes.

## Documentation

- [Docker-only development ADR](docs/adr/001-docker-only-development.md)
- [Project plan](.azure/project-plan.md)
- [Integration plan](.azure/integration-plan.md)
- [Scaffold runbook](.github/agents/azure-project-scaffold/instructions.md)
