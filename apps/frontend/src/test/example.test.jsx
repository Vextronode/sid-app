import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Example RTL Test', () => {
  it('menampilkan teks SIDUTama', () => {
    render(<h1>SIDUTama</h1>)

    expect(screen.getByRole('heading', { name: 'SIDUTama' })).toBeInTheDocument()
  })
})
