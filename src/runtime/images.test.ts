import { describe, expect, it } from 'vitest'
import { formatOf } from './images'

describe('formatOf', () => {
  it('maps extensions', () => {
    expect(formatOf('a.PNG')).toBe('png')
    expect(formatOf('b.webp')).toBe('webp')
    expect(formatOf('c.jpeg')).toBe('jpg')
    expect(formatOf('d.jpg')).toBe('jpg')
    expect(formatOf('e.gif')).toBe('unknown')
  })
})
