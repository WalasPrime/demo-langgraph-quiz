export interface HealthResponse {
  status: 'ok';
  service: 'api';
}

export interface ApiClient {
  getHealth(): Promise<HealthResponse | null>;
}
