import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PageSizeSelect } from './PageSizeSelect'
import { usePageSize } from './usePageSize'

describe('usePageSize', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts at 10 and remembers the choice per list', () => {
    const { result } = renderHook(() => usePageSize('daftar-a'))

    expect(result.current[0]).toBe(10)

    act(() => result.current[1](25))

    expect(result.current[0]).toBe(25)
    expect(renderHook(() => usePageSize('daftar-a')).result.current[0]).toBe(25)
    expect(renderHook(() => usePageSize('daftar-b')).result.current[0]).toBe(10)
  })

  it('falls back to the default for values outside the options', () => {
    window.localStorage.setItem('sid-page-size:daftar-a', '999')

    const { result } = renderHook(() => usePageSize('daftar-a'))

    expect(result.current[0]).toBe(10)

    act(() => result.current[1](7))

    expect(result.current[0]).toBe(10)
  })

  it('uses custom options with their first value as the default', () => {
    const options = [6, 12, 24]
    const { result } = renderHook(() => usePageSize('berita', { options }))

    expect(result.current[0]).toBe(6)
  })
})

describe('PageSizeSelect', () => {
  it('offers 10, 25, and 50 rows and reports the number chosen', () => {
    const onChange = vi.fn()

    render(<PageSizeSelect value={10} onChange={onChange} />)

    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Baris per halaman' })

    expect([...select.options].map((option) => option.value)).toEqual(['10', '25', '50'])

    fireEvent.change(select, { target: { value: '50' } })

    expect(onChange).toHaveBeenCalledWith(50)
  })
})
