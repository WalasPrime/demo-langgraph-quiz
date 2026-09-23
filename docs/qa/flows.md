# Browser QA Flows

These flows describe observable user behavior. Use accessible labels, roles, and visible text as selectors wherever possible. A flow is `passed` only when its expected visible state is observed in the browser.

## Shared Setup

- Start the stack with `docker compose up -d`.
- Confirm `GET http://localhost:3000/api/health` returns HTTP 200 and `{ "status": "ok", "service": "api" }`.
- Open `http://localhost:5173` in a fresh browser context.
- Default source URL: `https://raw.githubusercontent.com/pipecat-ai/pipecat/refs/heads/main/README.md`.
- Use a topic that is specific to the selected README, such as `Pipecat architecture`.
- The browser uses the graph routes: `POST /api/quizzes/graph`, `GET /api/quizzes/sessions/:sessionId/graph`, and `POST /api/quizzes/sessions/:sessionId/graph/resume`.
- The compatibility session routes remain available for legacy API clients: `POST /api/quizzes`, `GET /api/quizzes/sessions/:sessionId`, `POST /api/quizzes/sessions/:sessionId/answers`, and `GET /api/quizzes/sessions/:sessionId/result`.
- A started quiz is represented in the frontend URL as `/quiz/:sessionId`. The session ID is generated and returned by the backend; it is never entered by the user.
- Live generation requires a configured, reachable OpenAI-compatible provider. If it is unavailable, mark generation-dependent flows `blocked` with the provider error.
- A generated quiz must contain 5-8 questions. Each question has four options, and answer keys must never appear in browser-visible content or public API responses.

## QA-001: Initial Setup Form

**Purpose:** Verify the app opens in a usable initial state.

1. Open the frontend URL.
2. Observe `Build your quiz`, two labeled text inputs, and `Generate quiz`.
3. Confirm the source URL is prefilled and the topic input is empty.
4. Confirm `Generate quiz` is disabled while the topic is empty.
5. Enter a topic and confirm the button becomes enabled.

**Expected:** No API error is shown, and the form is ready to start a quiz.

## QA-002: Generate And Complete Quiz

**Purpose:** Verify the primary end-to-end user journey.

1. Complete QA-001 with the default source and a valid topic.
2. Activate `Generate quiz`.
3. Observe the loading state while the frontend polls `pending`/`running` graph snapshots, then a question card with a progress indicator and answer controls.
4. Select an answer and submit it. Repeat until the final question.
5. On the last question, activate `Finish quiz`.
6. Observe `Quiz complete`, a numeric weighted average, a score breakdown, and `Start another quiz`.

**Expected:** The browser URL contains the backend-generated session ID, the UI advances one question per submission, prevents submission without a selection, does not expose answer keys, and renders a completed result without an unhandled error.

## QA-003: Resume Active Session

**Purpose:** Verify restart-safe browser resume.

1. Start QA-002 and submit at least one answer, stopping before completion.
2. Reload the browser page or close and reopen the copied `/quiz/:sessionId` URL.
3. Observe the loading state followed by the same active session at the next unanswered question.
4. Submit another answer and confirm the session continues.

**Expected:** The graph snapshot resumes without returning to setup or losing submitted answers; refresh performs reads/polling only and does not start a second generation.

## QA-004: Completed Session Resume

**Purpose:** Verify a completed session remains viewable after reload.

1. Complete QA-002.
2. Reload the browser page at the same `/quiz/:sessionId` URL.
3. Observe the completed result and score breakdown again.

**Expected:** The app loads the stored completed graph state and result instead of showing an active question or starting a new session.

## QA-005: Invalid Source Error Recovery

**Purpose:** Verify safe handling of a rejected or unreachable Markdown source.

1. From setup, enter an invalid or disallowed HTTPS source URL.
2. Enter a non-empty topic and activate `Generate quiz`.
3. Observe the error message and `Try again` control.
4. Correct the source URL and retry.

**Expected:** The app shows a user-safe error, does not expose a stack trace or answer key, and returns to a usable setup/loading path after retry.

## QA-006: Start Another Quiz

**Purpose:** Verify completion reset behavior.

1. Complete QA-002 or load a completed session.
2. Activate `Start another quiz` or `Restart`.
3. Observe the setup form with no completed score visible.
4. Enter a new topic and start a new quiz.

**Expected:** The URL returns to `/`, the prior session is no longer active in the page, and the next quiz receives a distinct backend-generated session ID.

## QA-007: Graph State And Interrupt Contract

**Purpose:** Verify the graph-specific public projection and per-question resume behavior.

1. Start a quiz with `POST /api/quizzes/graph` using the default source and a valid topic.
2. Confirm the response contains a backend-generated UUID `id`, source URL, topic, empty `questions`/`answers`, and status `pending`.
3. Poll `GET /api/quizzes/sessions/:sessionId/graph` until the status becomes `awaiting_answer`, `completed`, or `error`.
4. Confirm the ready response contains 5-8 public questions and no `correctOptionId`, `requiredOptionIds`, Markdown source content, or model/provider details.
5. Submit the first answer to `POST /api/quizzes/sessions/:sessionId/graph/resume`.
6. Confirm the response contains the submitted answer, status `awaiting_answer`, and `currentQuestionIndex` advanced by one.
7. Repeat until the final answer is submitted.

**Expected:** The graph checkpoints pending/running state before source and LLM work, interrupts once per question, resumes with `Command({ resume })`, exposes only the next public state, and returns status `completed` with a deterministic score after the final answer.

## QA-008: Answer Validation And Idempotency

**Purpose:** Verify malformed, out-of-order, duplicate, and stale answer behavior.

1. Attempt to submit an answer with an empty `questionId`, more than four option IDs, or an unknown option ID.
2. Attempt to submit an answer for a question other than the current unanswered question.
3. Repeat a previously accepted answer through the compatibility session route with the same session version.
4. Submit a different answer for an already answered question.
5. Submit an answer using an old session version after another answer has been accepted.

**Expected:** Invalid payloads receive a safe 4xx response, out-of-order answers do not advance the graph, an identical repeated submission is idempotent, a conflicting repeated submission is rejected, and stale versions cannot overwrite newer answers. No response includes stack traces or answer keys.

## QA-009: Source And Generation Failure Recovery

**Purpose:** Verify failure handling at each pre-quiz graph stage.

1. Use an HTTP source, a disallowed HTTPS host, a URL that resolves to a private address, and an unreachable source.
2. Use an allowed source that returns a non-text content type, an HTTP error, an oversized response, or an unsafe redirect.
3. With a reachable source, simulate an unavailable or rate-limited OpenAI-compatible provider.
4. Retry from the browser after correcting the source or provider configuration.

**Expected:** The graph reaches a persisted `error` state with a safe error code/message, the browser shows `We couldn't load the quiz` and `Try again`, no partial quiz or answer key is shown, and a corrected retry can start a new usable session. Mark provider-dependent cases `blocked` when the environment cannot reproduce them.

## QA-010: Persistence And Recovery Boundaries

**Purpose:** Verify checkpoint and browser persistence across interruptions and restarts.

1. Start a quiz and stop while it is pending/running or waiting for an answer.
2. Restart the API container without deleting the MongoDB volumes.
3. Reload the browser and resume the stored session.
4. Query the graph state endpoint and compare its answer count and current question with the browser.
5. Complete the quiz, reload the browser, and query the graph state again.

**Expected:** The MongoDB checkpoint restores the same graph thread, generation is not re-invoked merely because the browser refreshed, submitted answers are retained, completed sessions remain completed with the same score, and the public state remains free of internal answer keys.

## Edge Case Matrix

| Case | Expected result |
| --- | --- |
| Empty topic or malformed source URL | Browser-side form validation prevents submission; direct API requests receive 4xx validation errors. |
| Non-HTTPS, disallowed, private-network, or unsafe-redirect source | Source fetch is rejected with a safe error; no quiz is created. |
| Source timeout, HTTP failure, invalid content type, or size limit | Graph ends in `error`; no Markdown content or stack trace is exposed publicly. |
| Provider unavailable, rate limited, malformed, or semantically invalid output | Generation-dependent QA is `blocked` when unreproducible; otherwise the graph reports a safe generation error and does not expose partial answer keys. |
| Fewer than 5 or more than 8 questions, duplicate IDs, or invalid option references | Generated output is rejected before the answer stage. |
| Empty selection | Submit/finish control remains disabled in the browser; a direct API request may be recorded as a wrong answer and score zero, so clients must enforce the non-empty selection rule. |
| Unknown question or option ID | Safe 4xx response; answer count and current question remain unchanged. |
| Answer submitted out of order | Safe 4xx response; graph does not advance. |
| Identical duplicate answer | Idempotent response with unchanged state. |
| Conflicting duplicate or stale version | Conflict/4xx response; previously stored answer and score remain unchanged. |
| Refresh during pending/running generation | Frontend reads and polls the existing URL session; it does not invoke generation again. |
| API restart during pending/running generation | Snapshot state remains available from MongoDB; a recent `running` state must not be blindly re-invoked. Stale-run recovery is a separate operational policy. |
| Refresh or API restart during an active quiz | Session resumes from the next unanswered question when MongoDB/checkpoint volumes remain available. |
| Completed-session refresh | Completed result and score breakdown remain visible. |
| Public state inspection | Questions contain prompts/options only; internal answer keys, source Markdown, and provider details are absent. |
| Start another quiz | URL returns to `/` and the new quiz receives a distinct backend-generated session ID. |