import type { ApiClient } from './types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...init,
	});
	if (!response.ok) {
		let message = `Request failed (${response.status})`;
		try {
			const body = await response.json() as { message?: string | string[] };
			if (body.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
		} catch {
			// Keep the HTTP status when the server does not return JSON.
		}
		throw new Error(message);
	}
	return response.json() as Promise<T>;
}

export const api: ApiClient = {
	getHealth: () => request('/api/health'),
	startQuiz: (sourceUrl, topic) => request('/api/quizzes', {
		method: 'POST',
		body: JSON.stringify({ sourceUrl, topic }),
	}),
	getSession: (sessionId) => request(`/api/quizzes/sessions/${encodeURIComponent(sessionId)}`),
	submitAnswer: (sessionId, answer, version) => request(`/api/quizzes/sessions/${encodeURIComponent(sessionId)}/answers`, {
		method: 'POST',
		body: JSON.stringify({ ...answer, version }),
	}),
	getResult: (sessionId) => request(`/api/quizzes/sessions/${encodeURIComponent(sessionId)}/result`),
	startGraph: (sourceUrl, topic) => request('/api/quizzes/graph', {
		method: 'POST',
		body: JSON.stringify({ sourceUrl, topic }),
	}),
	getGraphState: (sessionId) => request(`/api/quizzes/sessions/${encodeURIComponent(sessionId)}/graph`),
	resumeGraph: (sessionId, answer) => request(`/api/quizzes/sessions/${encodeURIComponent(sessionId)}/graph/resume`, {
		method: 'POST',
		body: JSON.stringify(answer),
	}),
};
export type { ApiClient } from './types';
