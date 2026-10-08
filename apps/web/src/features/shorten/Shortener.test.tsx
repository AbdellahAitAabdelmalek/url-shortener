import { screen } from '@testing-library/react';
import { type UserEvent, userEvent } from '@testing-library/user-event';
import type { Link } from '@url-shortener/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { Shortener } from './Shortener';

const link: Link = {
  code: 'aB3xK9q',
  shortUrl: 'http://localhost:4000/aB3xK9q',
  originalUrl: 'https://stoik.com/',
  createdAt: '2026-10-08T12:00:00.000Z',
};

function mockApi(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

async function shorten(user: UserEvent, url: string) {
  await user.type(screen.getByLabelText('Long URL'), url);
  await user.click(screen.getByRole('button', { name: 'Shorten' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Shortener', () => {
  it('shortens a URL and shows the short link', async () => {
    mockApi(201, link);
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'stoik.com');

    expect(await screen.findByText('Your short link is ready')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'localhost:4000/aB3xK9q' })).toHaveAttribute(
      'href',
      link.shortUrl,
    );
    expect(screen.getByText('https://stoik.com/')).toBeInTheDocument();
    // The pending placeholder is gone.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('sends the URL normalized by the shared schema', async () => {
    mockApi(201, link);
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'stoik.com');

    expect(fetch).toHaveBeenCalledWith(
      '/api/links',
      expect.objectContaining({ body: JSON.stringify({ url: 'https://stoik.com/' }) }),
    );
  });

  it('clears the field and moves the focus to the copy button', async () => {
    mockApi(201, link);
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'stoik.com');

    expect(await screen.findByRole('button', { name: 'Copy' })).toHaveFocus();
    expect(screen.getByLabelText('Long URL')).toHaveValue('');
  });

  it('copies the short link to the clipboard', async () => {
    mockApi(201, link);
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);
    await shorten(user, 'stoik.com');

    await user.click(await screen.findByRole('button', { name: 'Copy' }));

    expect(await navigator.clipboard.readText()).toBe(link.shortUrl);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('says when the URL already had a short link', async () => {
    mockApi(200, link);
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'stoik.com');

    expect(await screen.findByText('This URL already has a short link')).toBeInTheDocument();
  });

  it('validates the URL without calling the API', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'javascript:alert(1)');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please enter a valid URL, like https://example.com.',
    );
    expect(screen.getByLabelText('Long URL')).toHaveAttribute('aria-invalid', 'true');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('clears the error as soon as the URL is edited', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);
    await shorten(user, 'hello');

    await user.type(screen.getByLabelText('Long URL'), '.com');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error returned by the API and keeps the URL', async () => {
    mockApi(429, {
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in 1 minute.' },
    });
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'stoik.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many requests. Please try again in 1 minute.',
    );
    expect(screen.getByLabelText('Long URL')).toHaveValue('stoik.com');
  });

  it('shows a message when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'stoik.com');

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server.');
  });

  it('shows a pending state while the link is being created', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const user = userEvent.setup();
    renderWithProviders(<Shortener />);

    await shorten(user, 'stoik.com');

    expect(screen.getByRole('status')).toHaveTextContent('Creating your short link…');
    expect(screen.getByRole('button', { name: 'Shortening…' })).toBeDisabled();
    expect(screen.getByLabelText('Long URL')).toHaveAttribute('readonly');
  });
});
