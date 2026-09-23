import { BadRequestException, Injectable, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookup } from 'node:dns/promises';
import { AppConfig } from '../config/configuration';

export interface MarkdownSource {
  requestedUrl: string;
  finalUrl: string;
  content: string;
}

const MAX_REDIRECTS = 5;

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === '::1' || normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized.includes(':')) return normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
  const octets = normalized.split('.').map(Number);
  return octets.length === 4 && (octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168));
}

@Injectable()
export class MarkdownSourceService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async fetch(url: string): Promise<MarkdownSource> {
    const requestedUrl = this.normalizeGitHubBlob(url);
    let currentUrl = requestedUrl;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const parsed = await this.validateUrl(currentUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.getOrThrow('MARKDOWN_TIMEOUT_MS'));
      try {
        const response = await fetch(parsed, { redirect: 'manual', signal: controller.signal });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location || redirectCount === MAX_REDIRECTS) throw new BadRequestException('Markdown source has too many redirects or an invalid redirect');
          currentUrl = new URL(location, parsed).toString();
          continue;
        }
        if (!response.ok) throw new BadRequestException(`Markdown source returned HTTP ${response.status}`);
        const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
        if (contentType && !['text/markdown', 'text/plain', 'application/octet-stream'].includes(contentType)) throw new BadRequestException('Markdown source must have a text content type');
        const maxBytes = this.config.getOrThrow('MARKDOWN_MAX_BYTES');
        if (Number(response.headers.get('content-length') ?? 0) > maxBytes) throw new BadRequestException('Markdown source is too large');
        const body = await response.arrayBuffer();
        if (body.byteLength > maxBytes) throw new BadRequestException('Markdown source is too large');
        return { requestedUrl, finalUrl: parsed, content: Buffer.from(body).toString('utf8') };
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw new RequestTimeoutException('Markdown source request timed out');
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new BadRequestException('Markdown source could not be loaded');
  }

  private normalizeGitHubBlob(value: string): string {
    let url: URL;
    try { url = new URL(value); } catch { throw new BadRequestException('sourceUrl must be a valid HTTPS URL'); }
    if (url.protocol !== 'https:') throw new BadRequestException('sourceUrl must use HTTPS');
    if (url.hostname === 'github.com') {
      const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
      if (match) return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`;
    }
    return url.toString();
  }

  private async validateUrl(value: string): Promise<string> {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new BadRequestException('Markdown source redirects must use HTTPS');
    if (!this.config.getOrThrow('MARKDOWN_ALLOWED_HOSTS').includes(url.hostname.toLowerCase())) throw new BadRequestException('Markdown source host is not allowed');
    const addresses = await lookup(url.hostname, { all: true });
    if (addresses.some(({ address }) => isPrivateAddress(address))) throw new BadRequestException('Markdown source resolves to a private or link-local address');
    return url.toString();
  }
}