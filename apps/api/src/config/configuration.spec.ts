import { validateConfig } from './configuration';

describe('validateConfig', () => {
	it('provides safe local defaults', () => {
		expect(validateConfig({})).toEqual({
			MONGODB_URI: 'mongodb://mongodb:27017/toploox',
			MONGODB_DB: 'toploox',
			OPENAI_BASE_URL: 'https://api.openai.com/v1',
			OPENAI_API_KEY: '',
			OPENAI_MODEL: 'gpt-4o-mini',
			OPENAI_TIMEOUT_MS: 300_000,
			OPENAI_MAX_TOKENS: 4_000,
			QUIZ_GENERATION_RETRIES: 2,
			PORT: 3000,
			MARKDOWN_ALLOWED_HOSTS: ['github.com', 'raw.githubusercontent.com'],
			MARKDOWN_MAX_BYTES: 1_048_576,
			MARKDOWN_TIMEOUT_MS: 5_000,
			CORS_ORIGINS: ['http://localhost:5173'],
		});
	});

	it('normalizes a configured port and MongoDB URI', () => {
		expect(validateConfig({ MONGODB_URI: 'mongodb://localhost:27017/quiz', PORT: '3100' })).toEqual({
			MONGODB_URI: 'mongodb://localhost:27017/quiz',
			MONGODB_DB: 'toploox',
			OPENAI_BASE_URL: 'https://api.openai.com/v1',
			OPENAI_API_KEY: '',
			OPENAI_MODEL: 'gpt-4o-mini',
			OPENAI_TIMEOUT_MS: 300_000,
			OPENAI_MAX_TOKENS: 4_000,
			QUIZ_GENERATION_RETRIES: 2,
			PORT: 3100,
			MARKDOWN_ALLOWED_HOSTS: ['github.com', 'raw.githubusercontent.com'],
			MARKDOWN_MAX_BYTES: 1_048_576,
			MARKDOWN_TIMEOUT_MS: 5_000,
			CORS_ORIGINS: ['http://localhost:5173'],
		});
	});

	it.each([
		['PORT', { PORT: '0' }],
		['PORT', { PORT: 'not-a-port' }],
		['MONGODB_URI', { MONGODB_URI: 'https://localhost/quiz' }],
	])('rejects invalid %s configuration', (_, config) => {
		expect(() => validateConfig(config)).toThrow();
	});
});
