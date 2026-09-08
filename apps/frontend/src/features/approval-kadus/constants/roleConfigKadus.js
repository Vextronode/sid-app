// ==========================================
// roleConfigKadus.js
//
// Kadus = MONITORING SAJA
//
// Kadus dapat melihat perjalanan surat
// dari awal sampai selesai:
//
// Submit → RT → Selesai
//
// Kadus TIDAK melakukan approve/reject.
// ==========================================

export const ROLE_LABEL = "Kadus";

// ==========================================
// Semua status surat yang relevan untuk Kadus
// ==========================================

export const RELEVANT_STATUSES = [
  "pending",

  // Proses RT
  "rt_approved",
  "rt_rejected",

  // Proses Kantor Desa
  "kasi_approved",
  "kaur_tu_umum_approved",
  "petugas_desa_approved",

  // Final
  "completed",
];

// ==========================================
// Base path dashboard Kadus
// ==========================================

export const BASE_PATH = "/admin/dashboard-surat-kadus";