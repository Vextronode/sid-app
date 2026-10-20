import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getBerandaContent } from '../berandaContent'
import { KadesWelcome } from './KadesWelcome'

const content = getBerandaContent()
const village = {
  name: 'Desa Cibenda',
  head_name: 'Nama Lama (teks)',
  welcome_message: 'Selamat datang di layanan desa.',
}

describe('KadesWelcome', () => {
  it('shows the active village head name and photo from the officials data', () => {
    render(
      <KadesWelcome
        content={content}
        village={village}
        head={{ name: 'Asep Saepudin', photo_url: '/storage/officials/kades.jpg' }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Sambutan Kepala Desa' })).toBeInTheDocument()
    expect(screen.getByText('Asep Saepudin')).toBeInTheDocument()
    expect(screen.queryByText('Nama Lama (teks)')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto Asep Saepudin' })).toHaveAttribute(
      'src',
      '/storage/officials/kades.jpg',
    )
    expect(screen.getByText('Kepala Desa Cibenda')).toBeInTheDocument()
  })

  it('falls back to head_name and the placeholder without an active head', () => {
    render(<KadesWelcome content={content} village={village} head={null} />)

    expect(screen.getByText('Nama Lama (teks)')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the placeholder when the photo fails to load', () => {
    render(
      <KadesWelcome
        content={content}
        village={village}
        head={{ name: 'Asep Saepudin', photo_url: '/rusak.jpg' }}
      />,
    )

    fireEvent.error(screen.getByRole('img', { name: 'Foto Asep Saepudin' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders nothing without a welcome message', () => {
    const { container } = render(
      <KadesWelcome content={content} village={{ ...village, welcome_message: ' ' }} head={null} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
