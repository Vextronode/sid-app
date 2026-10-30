import { describe, expect, it } from 'vitest'

import { partialFixture } from '@/test/fixtures'
import type { Citizen } from '@/types'
import { EMPTY_CITIZEN_FORM, citizenToForm } from './citizenForm'

describe('citizenToForm', () => {
  it('keeps the data that the edit form does not change', () => {
    const form = citizenToForm(
      partialFixture<Citizen>({
        name: 'Asep',
        date_of_birth: '1990-01-02T00:00:00.000000Z',
        gender: 'L',
        rt_id: 4,
        blood_type: 'O',
        religion: 'islam',
        occupation_id: 7,
        marital_status: 'kawin',
        last_education: 'slta',
        marriage_date: '2015-06-01',
        has_disorder: true,
        disability: 'Tunanetra',
      }),
    )

    expect(form).toMatchObject({
      nik: '',
      name: 'Asep',
      date_of_birth: '1990-01-02',
      rt_id: '4',
      blood_type: 'O',
      religion: 'islam',
      occupation_id: '7',
      marital_status: 'kawin',
      last_education: 'slta',
      marriage_date: '2015-06-01',
      has_disorder: true,
      disability: 'Tunanetra',
    })
  })

  it('uses the form defaults for empty data', () => {
    expect(citizenToForm(partialFixture<Citizen>({ name: 'Iis' }))).toEqual({
      ...EMPTY_CITIZEN_FORM,
      name: 'Iis',
    })
  })
})
