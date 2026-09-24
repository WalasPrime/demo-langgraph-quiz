# Toploox Quiz

A Docker Compose application that turns GitHub Markdown into an interactive quiz. The stack includes a NestJS API, React frontend, MongoDB persistence, and optional LangSmith tracing.

## Run locally

Requirements: Docker Engine with Docker Compose.

1. Create the local environment file:

   ```sh
   cp .env.example .env
   ```

2. Set the required provider value in `.env`:

   ```dotenv
   OPENAI_API_KEY=your-api-key
   ```

   The default OpenAI-compatible endpoint and model are already configured. LangSmith is optional; set `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`, and optionally `LANGSMITH_PROJECT` or `LANGSMITH_WORKSPACE_ID` to enable tracing.

3. Start the services:

   ```sh
   docker compose up -d --build
   ```

4. Verify the API and open the application:

   ```sh
   curl http://localhost:3000/api/health
   ```

   - Frontend: <http://localhost:5173>
   - API: <http://localhost:3000>
   - Mongo Express: <http://localhost:8081> (`admin` / `admin` by default)

The API and frontend install their dependencies on first startup. Source files are bind-mounted, so edits are picked up by the development servers.

## Tests and builds

Run Node/npm commands inside the workspace container:

```sh
docker compose exec workspace npm install
docker compose exec workspace npm --prefix apps/api run build
docker compose exec workspace npm --prefix apps/api test
docker compose exec workspace npm --prefix apps/frontend run build
docker compose exec workspace npm --prefix apps/frontend test
```

## Stop the stack

```sh
docker compose down
```

To also remove MongoDB data and dependency volumes:

```sh
docker compose down -v
```

See [docs/qa/flows.md](docs/qa/flows.md) for browser-level acceptance flows and [docs/adr/001-docker-only-development.md](docs/adr/001-docker-only-development.md) for the local development rationale.