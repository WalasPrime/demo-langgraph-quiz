# Product And Workflow Requirements

This document records the requirements agreed during implementation discussions. It complements the broader scope in [task.md](task.md), while documenting the newer session and workflow behavior explicitly.

## Session URLs

- Quiz sessions use a backend-generated UUID.
- The frontend represents a session at `/quiz/:sessionId`.
- Users do not enter, choose, or generate session IDs.
- Starting a quiz creates a new backend session and navigates the browser to its URL.
- Refreshing or sharing the session URL must address the same quiz session.
- Starting another quiz returns the browser to `/` and creates a distinct session ID.
- Anonymous session URLs are bearer links: anyone with the URL can access that session. Authentication is not part of the current requirement.

## LangGraph Ownership

- LangGraph is the authoritative source of workflow state.
- Workflow lifecycle state is stored in LangGraph checkpoints; a separate domain projection must not decide whether generation should run or resume.
- The graph must include explicit state-management stages around the work:
  - initialize a session checkpoint;
  - mark the session as `pending`/`running` and record timestamps;
  - fetch and validate the Markdown source;
  - generate structured questions;
  - interrupt for one frontend answer at a time;
  - resume with the submitted answer;
  - grade deterministically and write the final score.
- Public graph state must contain only safe fields. Generated answer keys, raw Markdown, and provider details must never be returned to the frontend.

## Asynchronous Generation

- Starting a graph session must return the backend-generated session ID without waiting for the source fetch or LLM call to finish.
- The initial public state is `pending`.
- The background graph run advances through `running`, source/generation states, and then `awaiting_answer`, `completed`, or `error`.
- The frontend polls `GET /api/quizzes/sessions/:sessionId/graph` while the session is `pending` or `running`.
- Polling is read-only. A browser refresh must not invoke the graph again or create another LLM call.
- Once the graph reaches `awaiting_answer`, polling stops and the frontend renders the question.
- Answer submission resumes the graph through `POST /api/quizzes/sessions/:sessionId/graph/resume`.
- A completed or error snapshot is terminal for the frontend view.

## Refresh And Recovery

- A refresh during generation must recover through the session URL and checkpoint snapshot.
- A refresh during the answer flow must show the next unanswered question.
- A refresh after completion must show the stored score and breakdown.
- A recent `running` snapshot must not be automatically re-invoked merely because the browser refreshed.
- Automatic recovery of a stale `running` snapshot after an API crash is deferred. Retrying that state safely requires a lease, heartbeat, or explicit retry policy so a slow LLM call is not duplicated.

## API Contract

The graph-backed frontend uses:

- `POST /api/quizzes/graph` to create a session and return its initial public snapshot.
- `GET /api/quizzes/sessions/:sessionId/graph` to read the current public snapshot.
- `POST /api/quizzes/sessions/:sessionId/graph/resume` to submit one answer and return the next snapshot.

The older session routes remain available for compatibility with existing clients. They are not the frontend's orchestration source of truth.

## Existing Quiz Constraints

- Source URLs must use HTTPS and satisfy the configured Markdown host/security checks.
- The default browser and QA source is `https://raw.githubusercontent.com/pipecat-ai/pipecat/refs/heads/main/README.md`.
- Generated quizzes contain 5-8 questions with four options each.
- Grading remains deterministic and does not call the LLM.
- Duplicate identical answer submissions remain idempotent; stale or conflicting submissions must not overwrite checkpointed state.
