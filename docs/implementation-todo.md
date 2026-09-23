# Implementation Todo

- [x] Probe the configured OpenAI-compatible endpoint with LangChain structured output.
  The request reached the provider; the configured free model returned an upstream 429 capacity error.
- [x] Add a basic ESLint flat configuration and run autofix.
- [x] Make Zod schemas the source of truth for HTTP payloads, persisted quiz documents, and public API types via `z.infer`.
- [x] Replace class-validator DTOs with a Zod validation pipe and preserve safe HTTP errors.
- [x] Enforce structured output in the LangChain model invocation and type the generator around the structured schema.
- [x] Add deterministic tests for schema validation, persistence parsing, structured generation, and retry behavior.
- [x] Re-run lint, API/frontend tests, builds, and Compose/runtime checks.
- [x] Expand LangGraph to fetch, generate, interrupt per question, resume, grade deterministically, and expose a redacted public state projection.
- [x] Add graph REST endpoints for start, state, and per-question resume.
- [x] Add checkpointed pending/running graph state and asynchronous frontend polling with backend-generated URL session IDs.
- [ ] Retry the live provider test after the upstream rate limit clears or the configured model/provider changes.
