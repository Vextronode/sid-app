import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePublicNews } from '@/features/berita/usePublicNews';
import { BerandaPage } from './BerandaPage';

vi.mock('@/features/berita/usePublicNews', () => ({
  usePublicNews: vi.fn(),
}));

describe('BerandaPage news section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <BerandaPage />
      </MemoryRouter>,
    );

  it('shows loading state while fetching public news', () => {
    usePublicNews.mockReturnValue({ news: [], loading: true, error: null });

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Memuat berita...');
  });

  it('shows API errors explicitly', () => {
    usePublicNews.mockReturnValue({
      news: [],
      loading: false,
      error: 'Gagal memuat berita.',
    });

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat berita.');
  });

  it('shows an empty state when there is no published news', () => {
    usePublicNews.mockReturnValue({ news: [], loading: false, error: null });

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Belum ada berita yang dipublikasikan.',
    );
  });

  it('displays up to three news items from the public API', () => {
    usePublicNews.mockReturnValue({
      news: [1, 2, 3, 4].map((id) => ({
        id,
        title: `Berita ${id}`,
        date: '1 Juli 2026',
        excerpt: `Ringkasan ${id}`,
        content: [],
        imageUrl: null,
      })),
      loading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByRole('link', { name: /Berita 1/ })).toHaveAttribute(
      'href',
      '/berita/1',
    );
    expect(screen.getByRole('link', { name: /Berita 2/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Berita 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Berita 4/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lihat semua berita' })).toHaveAttribute(
      'href',
      '/berita',
    );
  });
});
