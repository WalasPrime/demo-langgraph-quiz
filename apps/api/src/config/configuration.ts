export interface AppConfig {
	PORT: number;
	MONGODB_URI: string;
	MONGODB_DB: string;
	OPENAI_BASE_URL: string;
	OPENAI_API_KEY: string;
	OPENAI_MODEL: string;
	OPENAI_TIMEOUT_MS: number;
	OPENAI_MAX_TOKENS: number;
	QUIZ_GENERATION_RETRIES: number;
	MARKDOWN_ALLOWED_HOSTS: string[];
	MARKDOWN_MAX_BYTES: number;
	MARKDOWN_TIMEOUT_MS: number;
	CORS_ORIGINS: string[];
}

function parsePort(value: unknown): number {
	const port = Number(value ?? 3000);

	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('PORT must be an integer between 1 and 65535');
	}

	return port;
}

function parseMongoUri(value: unknown): string {
	const uri = String(value ?? 'mongodb://mongodb:27017/toploox').trim();

	try {
		const parsed = new URL(uri);

		if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
			throw new Error();
		}
	} catch {
		throw new Error('MONGODB_URI must be a valid MongoDB connection URI');
	}

	return uri;
}

function parseString(value: unknown, fallback: string): string {
	const parsed = String(value ?? fallback).trim();

	if (!parsed)
		throw new Error('Configuration values must not be empty');

	return parsed;
}

function parsePositiveInteger(value: unknown, fallback: number, name: string): number {
	const parsed = Number(value ?? fallback);

	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new Error(`${name} must be a positive integer`);
	}

	return parsed;
}

function parseAllowedHosts(value: unknown): string[] {
	const hosts = String(value ?? 'github.com,raw.githubusercontent.com')
		.split(',')
		.map((host) => host.trim().toLowerCase())
		.filter(Boolean);

	if (hosts.length === 0 || hosts.some((host) => host.includes('/') || host.includes(':'))) {
		throw new Error('MARKDOWN_ALLOWED_HOSTS must contain host names only');
	}

	return hosts;
}

function parseCorsOrigins(value: unknown): string[] {
	const origins = String(value ?? 'http://localhost:5173')
		.split(',')
		.map((origin) => origin.trim().replace(/\/$/, ''))
		.filter(Boolean);

	if (
		origins.length === 0 ||
		origins.some((origin) => {
			try {
				const parsed = new URL(origin);

				return (
					!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash
				);
			} catch {
				return true;
			}
		})
	) {
		throw new Error('CORS_ORIGINS must contain valid HTTP or HTTPS origins');
	}

	return origins;
}

export function validateConfig(config: Record<string, unknown>): AppConfig {
	return {
		MONGODB_URI: parseMongoUri(config.MONGODB_URI),
		MONGODB_DB: parseString(config.MONGODB_DB, 'toploox'),
		OPENAI_BASE_URL: parseString(config.OPENAI_BASE_URL, 'https://api.openai.com/v1'),
		OPENAI_API_KEY: String(config.OPENAI_API_KEY ?? '').trim(),
		OPENAI_MODEL: parseString(config.OPENAI_MODEL, 'gpt-4o-mini'),
		OPENAI_TIMEOUT_MS: parsePositiveInteger(config.OPENAI_TIMEOUT_MS, 300_000, 'OPENAI_TIMEOUT_MS'),
		OPENAI_MAX_TOKENS: parsePositiveInteger(config.OPENAI_MAX_TOKENS, 4_000, 'OPENAI_MAX_TOKENS'),
		QUIZ_GENERATION_RETRIES: parsePositiveInteger(config.QUIZ_GENERATION_RETRIES, 2, 'QUIZ_GENERATION_RETRIES'),
		PORT: parsePort(config.PORT),
		MARKDOWN_ALLOWED_HOSTS: parseAllowedHosts(config.MARKDOWN_ALLOWED_HOSTS),
		MARKDOWN_MAX_BYTES: parsePositiveInteger(config.MARKDOWN_MAX_BYTES, 1_048_576, 'MARKDOWN_MAX_BYTES'),
		MARKDOWN_TIMEOUT_MS: parsePositiveInteger(config.MARKDOWN_TIMEOUT_MS, 5_000, 'MARKDOWN_TIMEOUT_MS'),
		CORS_ORIGINS: parseCorsOrigins(config.CORS_ORIGINS),
	};
}
