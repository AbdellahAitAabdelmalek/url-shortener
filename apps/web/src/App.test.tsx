import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { renderWithProviders } from './test/render';

describe('App', () => {
  it('renders the page title and the form', () => {
    renderWithProviders(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'URL Shortener' })).toBeInTheDocument();
    expect(screen.getByLabelText('Long URL')).toBeInTheDocument();
  });
});
