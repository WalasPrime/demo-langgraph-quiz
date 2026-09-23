# Quiz Implementation Plan

## Scope

Turn the NestJS and React scaffold into a resumable quiz application that fetches allowlisted Markdown, generates a validated 5-8 question quiz through LangChain and LangGraph, persists workflow and domain state in MongoDB, exposes REST transitions, and runs through a Fluent UI web interface.

## Production Requirements

- Anonymous server-generated session IDs with restart-safe resume.
- OpenAI-compatible LLM configuration through environment variables.
- HTTPS Markdown sources restricted by a configured host allowlist.
- GitHub blob URL normalization, redirect revalidation, private-network rejection, response limits, and request timeouts.
- NestJS validation, bounded generation retries, safe error responses, configured CORS, and graceful MongoDB shutdown.
- Generated answer keys are never returned by the REST session endpoints.

## Data Flow

1. The client sends a source URL and topic to `POST /api/quizzes`.
2. The API validates and fetches bounded Markdown from an allowed host.
3. A LangGraph thread generates structured questions and retries invalid model output within a configured limit.
4. The graph checkpoint is stored in MongoDB for workflow resume.
5. A denormalized MongoDB session projection stores source metadata, questions, submitted answers, status, version, and score.
6. The client submits one answer at a time with the session version. Repeated identical submissions are idempotent.
7. The API calculates the weighted score using ordered weights `1.0 * 1.1^index` and stores the result.

## Scoring

- Single-choice: `4` for the correct option, otherwise `0`.
- Multi-choice: one point per correctly selected required option; extra incorrect selections have no penalty.
- Final score: weighted average of individual question scores.

## Implementation Sequence

1. Configuration, security boundaries, MongoDB Compose service, and health checks.
2. Source ingestion and validation.
3. LangChain/LangGraph generation with schema validation and bounded repair.
4. MongoDB checkpointing and denormalized session persistence.
5. REST quiz transitions, scoring, idempotency, and safe public DTOs.
6. React quiz setup, resume, answer submission, and result views.
7. Unit, integration, frontend, runtime smoke tests, and documentation cleanup.

## Verification

Run the API and frontend tests/builds inside the workspace container, validate `docker compose config`, verify MongoDB and `GET /api/health`, and exercise the complete flow against two configured README URLs with an OpenAI-compatible endpoint. Test invalid hosts, unsafe redirects, oversized sources, malformed model output, stale versions, duplicate submissions, completed sessions, and restart/resume behavior.
