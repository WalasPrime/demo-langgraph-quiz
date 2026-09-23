import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the service health shell', () => {
    render(<App />);
    expect(screen.getByText('Service Health')).toBeInTheDocument();
  });
});
