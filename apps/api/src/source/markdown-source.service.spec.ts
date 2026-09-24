import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookup } from 'node:dns/promises';
import { MarkdownSourceService } from './markdown-source.service';

jest.mock('node:dns/promises', () => ({ lookup: jest.fn() }));

describe('MarkdownSourceService', () => {
	const config = new ConfigService({
		MARKDOWN_ALLOWED_HOSTS: ['github.com', 'raw.githubusercontent.com', 'docs.example.com'],
		MARKDOWN_MAX_BYTES: 100,
		MARKDOWN_TIMEOUT_MS: 100,
	});
	const service = new MarkdownSourceService(config as unknown as ConfigService<any, true>);

	beforeEach(() => {
		jest.clearAllMocks();
		(lookup as jest.Mock).mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
	});

	it('normalizes GitHub blob URLs to raw URLs', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValue(new Response('# quiz', { headers: { 'content-type': 'text/markdown' } }));

		const source = await service.fetch('https://github.com/acme/docs/blob/main/README.md');

		expect(source.finalUrl).toBe('https://raw.githubusercontent.com/acme/docs/main/README.md');
		expect(global.fetch).toHaveBeenCalledWith(source.finalUrl, expect.objectContaining({ redirect: 'manual' }));
	});

	it('rejects disallowed hosts before fetching', async () => {
		await expect(service.fetch('https://evil.example/README.md')).rejects.toBeInstanceOf(BadRequestException);
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('revalidates a redirect destination', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://evil.example/file.md' } }));

		await expect(service.fetch('https://docs.example.com/file.md')).rejects.toBeInstanceOf(BadRequestException);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('rejects private DNS results', async () => {
		(lookup as jest.Mock).mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

		await expect(service.fetch('https://docs.example.com/file.md')).rejects.toBeInstanceOf(BadRequestException);
	});

	it('rejects oversized responses and non-text content', async () => {
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce(new Response('x'.repeat(101), { headers: { 'content-type': 'text/plain' } }));
		await expect(service.fetch('https://docs.example.com/file.md')).rejects.toBeInstanceOf(BadRequestException);

		global.fetch = jest.fn().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
		await expect(service.fetch('https://docs.example.com/file.md')).rejects.toBeInstanceOf(BadRequestException);
	});

	it('aborts requests that exceed the configured timeout', async () => {
		global.fetch = jest.fn().mockImplementation(
			(_url, init: RequestInit) =>
				new Promise((_, reject) => {
					init.signal?.addEventListener('abort', () =>
						reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
					);
				}),
		);

		await expect(service.fetch('https://docs.example.com/file.md')).rejects.toMatchObject({ status: 408 });
	});
});
