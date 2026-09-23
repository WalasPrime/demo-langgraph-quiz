import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns the API health contract', () => {
    expect(new HealthService().getStatus()).toEqual({ status: 'ok', service: 'api' });
  });
});
