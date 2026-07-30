import api from "@/lib/api";

export function getGenderStats(){
    return api.get("/api/dashboard/gender-stats");
}

/**
 * Mengambil daftar surat sesuai role.
 *
 * role:
 * - rt
 * - rw
 * - kadus
 * - kasi
 */
export const getSuratList = (role, params = {}) =>
  api.get(`/api/${role}/letters`, { params });

/**
 * Mengambil detail surat.
 *
 * Semua role menggunakan endpoint yang sama.
 */
export const getSuratDetail = (id) =>
  api.get(`/api/letters/${id}`);

/**
 * RT & Kadus menggunakan endpoint decision.
 *
 * status:
 * - approved
 * - rejected
 */
export const submitDecision = (
  role,
  id,
  status,
  notes = null
) =>
  api.patch(`/api/${role}/letters/${id}/decision`, {
    status,
    notes,
  });

/**
 * RW & Kasi menggunakan endpoint approve.
 *
 * status:
 * - approved
 * - rejected
 */
export const approveSurat = (
  role,
  id,
  status,
  notes = null
) =>
  api.patch(`/api/${role}/approvals/${id}/approve`, {
    status,
    notes,
  });