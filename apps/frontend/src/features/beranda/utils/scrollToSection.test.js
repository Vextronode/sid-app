import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollToSection } from './scrollToSection'

const mockReducedMotion = (matches) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches })
}

describe('scrollToSection', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    document.body.innerHTML = ''
    window.matchMedia = originalMatchMedia
  })

  const addSection = (id) => {
    const section = document.createElement('section')
    section.id = id
    section.scrollIntoView = vi.fn()
    document.body.append(section)
    return section
  }

  it('scrolls smoothly by default', () => {
    mockReducedMotion(false)
    const section = addSection('kontak')

    expect(scrollToSection('kontak')).toBe(true)
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('jumps without animation when reduced motion is preferred', () => {
    mockReducedMotion(true)
    const section = addSection('transparansi')

    scrollToSection('transparansi')
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('returns false when the section is missing', () => {
    expect(scrollToSection('tidak-ada')).toBe(false)
  })
})
