import api from '@/lib/api'
import type { IsoDateString, Uuid } from '@/types'

// Client integrasi pihak ketiga (Cimart, dll.) untuk menu Integrasi Staf
// SIDUTama. Sumber: IntegrationClientResource. Nilai token tidak pernah ada
// di sini kecuali di respons penerbitan token baru (sekali).

export type IntegrationAbility = { value: string; label: string }

export type IntegrationToken = {
  id: Uuid
  name: string
  created_at: IsoDateString | null
  last_used_at: IsoDateString | null
}

export type IntegrationClient = {
  id: Uuid
  slug: string
  name: string
  is_active: boolean
  abilities: IntegrationAbility[]
  // Pemakaian terakhir dari token mana pun.
  last_used_at: IsoDateString | null
  // Terbaru lebih dulu.
  tokens: IntegrationToken[]
}

type ClientResponse = { data: IntegrationClient; message: string }

export async function getIntegrationClients() {
  const response = await api.get<{ data: IntegrationClient[] }>('/api/integration-clients')

  return response.data.data
}

// Menonaktifkan tanpa kata sandi; mengaktifkan wajib kata sandi.
export async function updateIntegrationClientStatus(
  id: Uuid,
  isActive: boolean,
  password?: string,
) {
  const response = await api.patch<ClientResponse>(`/api/integration-clients/${id}/status`, {
    is_active: isActive,
    ...(isActive ? { password } : {}),
  })

  return response.data
}

// Rotate: token baru dikembalikan sekali; token lama tetap berlaku.
export async function issueIntegrationToken(id: Uuid, password: string) {
  const response = await api.post<ClientResponse & { token: string }>(
    `/api/integration-clients/${id}/tokens`,
    { password },
  )

  return response.data
}

export async function revokeIntegrationToken(id: Uuid, tokenId: Uuid, password: string) {
  const response = await api.delete<ClientResponse>(
    `/api/integration-clients/${id}/tokens/${tokenId}`,
    { data: { password } },
  )

  return response.data
}
