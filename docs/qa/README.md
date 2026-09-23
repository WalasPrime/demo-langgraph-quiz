# QA Guide

This directory contains the browser-level acceptance flows for the Toploox quiz application. The flow catalog is maintained alongside the product and is the contract used by `.github/agents/toploox-task-qa.agent.md`.

## Running QA

The local runtime is Docker-only. From the repository root:

```sh
docker compose up -d
curl http://localhost:3000/api/health
```

Open `http://localhost:5173` in a browser and execute the flows in [flows.md](flows.md). The live generation flow requires a reachable OpenAI-compatible provider configured through the variables in `docker-compose.yml`.

## Debugging Failures

Keep the API logs running while reproducing a browser failure:

```sh
docker compose logs -f --tail=200 api
```

For a bounded report after reproducing, use `docker compose logs --since=10m api mongodb`. Check the API for request paths, status codes, NestJS exceptions, provider failures, and persistence errors; check MongoDB for connection or storage errors. Stop a follow session with Ctrl+C. Correlate log timestamps with the browser failure before deciding which layer owns the defect.

## Maintenance

Keep flow IDs stable. Update the affected flow when user-facing labels, controls, routes, persistence, loading/error states, or completion behavior change. Add a flow when a new user journey is introduced. Record environment or provider limitations as `blocked`, never as `passed`.