import type { ApiClient, HealthResponse } from './types';
import { previewState } from './previewState';
import { healthResponse } from '../mocks/data';

function resolveHealth(): Promise<HealthResponse | null> {
  if (previewState === 'loading') {
    return new Promise(() => undefined);
  }
  if (previewState === 'error') {
    return Promise.reject(new Error('The mock API is unavailable.'));
  }
  if (previewState === 'empty') {
    return Promise.resolve(null);
  }
  return Promise.resolve(healthResponse);
}

export const mockClient: ApiClient = {
  getHealth: resolveHealth,
};
