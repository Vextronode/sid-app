import { describe, expect, it } from 'vitest'
import { guardianRelation, guardianRelationLabel } from './guardianRelation'

// Sama dengan MigrantWorkerTest::test_guardian_relation_is_derived_from_both_family_roles.
describe('guardianRelation', () => {
  it.each([
    ['kepala_keluarga', 'istri', 'P', 'istri'],
    ['istri', 'kepala_keluarga', 'L', 'suami'],
    ['anak', 'kepala_keluarga', 'L', 'ayah'],
    ['anak', 'istri', 'P', 'ibu'],
    ['anak', 'anak', 'L', 'saudara'],
    ['kepala_keluarga', 'orang_tua', 'P', 'ibu'],
    ['istri', 'orang_tua', 'P', 'mertua'],
    ['kepala_keluarga', 'anak', 'L', 'anak'],
    ['anak', 'orang_tua', 'L', 'kakek_nenek'],
    ['famili_lain', 'kepala_keluarga', 'L', 'famili_lain'],
  ])('%s -> %s (%s) = %s', (applicant, member, gender, expected) => {
    expect(guardianRelation(applicant, member, gender)).toBe(expected)
  })

  it('labels relations for display', () => {
    expect(guardianRelationLabel('kakek_nenek')).toBe('Kakek/Nenek')
    expect(guardianRelationLabel(null)).toBeNull()
  })
})
