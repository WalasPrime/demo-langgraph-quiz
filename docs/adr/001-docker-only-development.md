# ADR 001: Docker-Only Local Development

- Status: Accepted
- Date: 2026-09-23

## Context

The repository is mounted from a network volume, and host Node.js/npm are not prerequisites. Installing dependencies directly into `apps/api/node_modules` or `apps/frontend/node_modules` would be slow and would make local behavior depend on host tooling. The application may use external LLM observability, but that service should not be required for the local application stack.

## Decision

Use Docker Compose as the local development boundary. The `workspace` service runs all npm install, build, and test commands. The API and frontend services run from their own containers. Their dependency trees live in the named `api_node_modules` and `frontend_node_modules` volumes, which are shared with `workspace` and the corresponding runtime service. LangSmith Cloud tracing is configured through API environment variables and is optional at runtime.

The source tree remains bind-mounted for editing. No host Node.js or npm installation is required.

## Consequences

- Developers must prefix npm commands with `docker compose exec workspace`.
- Dependency installs avoid the network-mounted source volume after the initial package manifest read.
- Runtime services use the same dependency volumes validated by the workspace.
- Docker Engine and Docker Compose are required on the host.
- LangSmith Cloud usage requires `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY`; leaving tracing disabled keeps the API local and functional.
- The named volumes can be recreated with `docker compose down -v` when a clean dependency install is needed.
