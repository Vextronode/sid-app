// ==========================================
// OperatorSuratListPage.jsx
// Halaman "Daftar Permohonan Surat" untuk Operator Desa.
// Logic/API tidak diubah.
// Styling dipindahkan ke Global CSS.
// ==========================================

import OperatorSuratPreviewModal from "@/features/operator-desa/components/OperatorSuratPreviewModal";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Search,
  Pencil,
  Eye,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { getSuratList } from "@/features/approval/api";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import OperatorSuratActionModal from "@/features/operator-desa/components/OperatorSuratActionModal";
import { FooterOperator } from "../../components/layout/FooterOperator";

const STATUS_LABEL = {
  pending: {
    label: "Pending",
    className: "sid-status-pending",
  },

  rt_approved: {
    label: "RT Approved",
    className: "sid-status-progress",
  },

  rw_approved: {
    label: "RW Approved",
    className: "sid-status-progress",
  },

  kasi_approved: {
    label: "Verified",
    className: "sid-status-done",
  },

  rt_rejected: {
    label: "Ditolak RT",
    className: "sid-status-rejected",
  },

  rw_rejected: {
    label: "Ditolak RW",
    className: "sid-status-rejected",
  },

  kasi_rejected: {
    label: "Ditolak Kasi",
    className: "sid-status-rejected",
  },

  waiting_revision_warga: {
    label: "Menunggu Revisi",
    className: "sid-status-pending",
  },

  rejected_revision: {
    label: "Ditolak (Batas Revisi)",
    className: "sid-status-rejected",
  },
};

const ITEMS_PER_PAGE = 3;

export default function OperatorSuratListPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [previewSurat, setPreviewSurat] = useState(null);

  // Delete confirmation
  const [deleteSurat, setDeleteSurat] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const ROLE_ENDPOINT = {
    rt: "rt",
    rw: "rw",
    kasi_pelayanan: "kasi",
    kaur_tu_umum: "kasi",
    petugas_desa: "kasi",
  };

  const roleKey = ROLE_ENDPOINT[user?.role] ?? user?.role;

  // ==========================================
  // LOAD DATA
  // ==========================================
  const loadLetters = async (showLoading = true) => {
    if (!roleKey) return;

    if (showLoading) {
      setLoading(true);
    }

    try {
      const res = await getSuratList(roleKey);
      setLetters(res.data);
    } catch (err) {
      console.error(
        "Gagal mengambil data surat:",
        err.response?.data ?? err
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // ==========================================
  // LOAD DATA PERTAMA KALI
  // ==========================================
  useEffect(() => {
    loadLetters(true);
  }, [roleKey]);

  // ==========================================
  // AUTO REFRESH DATA SETIAP 5 DETIK
  // ==========================================
  useEffect(() => {
    if (!roleKey) return;

    const interval = setInterval(() => {
      loadLetters(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [roleKey]);

  // ==========================================
  // FILTER + SORT
  // ==========================================
  const filtered = useMemo(() => {
    let result = [...letters];

    if (filterJenis) {
      result = result.filter(
        (s) => s.letter_type?.name === filterJenis
      );
    }

    if (filterStatus) {
      switch (filterStatus) {
        case "verification":
          result = result.filter((s) =>
            ["rt_approved", "rw_approved"].includes(s.status)
          );
          break;

        case "completed":
          result = result.filter(
            (s) => s.status === "kasi_approved"
          );
          break;

        case "rejected":
          result = result.filter((s) =>
            ["rt_rejected", "rw_rejected"].includes(s.status)
          );
          break;

        default:
          break;
      }
    }

    if (search) {
      const kw = search.toLowerCase();

      result = result.filter(
        (s) =>
          s.applicant_name?.toLowerCase().includes(kw) ||
          s.letter_number?.toLowerCase().includes(kw)
      );
    }

    // Urutkan berdasarkan selesai sampai ditolak
    const STATUS_ORDER = {
      kasi_approved: 1,
      rw_approved: 2,
      rt_approved: 3,
      pending: 4,
      rw_rejected: 5,
      rt_rejected: 6,
      kasi_rejected: 7,
    };

    result.sort((a, b) => {
      const dateA = new Date(a.submitted_at ?? a.created_at);
      const dateB = new Date(b.submitted_at ?? b.created_at);

      const onlyDateA = new Date(
        dateA.getFullYear(),
        dateA.getMonth(),
        dateA.getDate()
      );

      const onlyDateB = new Date(
        dateB.getFullYear(),
        dateB.getMonth(),
        dateB.getDate()
      );

      if (onlyDateA.getTime() !== onlyDateB.getTime()) {
        return onlyDateB - onlyDateA;
      }

      const orderA = STATUS_ORDER[a.status] ?? 999;
      const orderB = STATUS_ORDER[b.status] ?? 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return dateB - dateA;
    });

    return result;
  }, [letters, filterJenis, filterStatus, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ITEMS_PER_PAGE)
  );

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return filtered.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [filtered, currentPage]);

  const jenisOptions = useMemo(() => {
    const set = new Set(
      letters
        .map((s) => s.letter_type?.name)
        .filter(Boolean)
    );

    return Array.from(set);
  }, [letters]);

  return (
    <div className="sid-operator-page">

      <main className="sid-operator-content">

        {/* ==========================================
            HEADER
        ========================================== */}
        <div className="sid-operator-breadcrumb">
          Admin /
          <span> Daftar Permohonan Surat</span>
        </div>

        <div className="sid-operator-header">
          <h1>Daftar Permohonan Surat</h1>

          <button className="sid-operator-export">
            <Download size={16} />
            Ekspor Laporan
          </button>
        </div>

        {/* ==========================================
            SEARCH + FILTER
        ========================================== */}
        <div className="sid-operator-filter-card">

          <div className="sid-operator-filter-grid">

            <div className="sid-operator-filter-field">
              <p>Pencarian Cepat</p>

              <div className="sid-operator-search">
                <Search size={16} />

                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nomor surat atau nama pemohon..."
                />
              </div>
            </div>

            <div className="sid-operator-filter-field">
              <p>Jenis Surat</p>

              <select
                value={filterJenis}
                onChange={(e) => {
                  setFilterJenis(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Semua Jenis</option>

                {jenisOptions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div className="sid-operator-filter-field">
              <p>Status</p>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Semua Status</option>
                <option value="verification">
                  Verifikasi
                </option>
                <option value="completed">
                  Selesai
                </option>
                <option value="rejected">
                  Ditolak
                </option>
              </select>
            </div>

          </div>
        </div>

        {/* ==========================================
            TABLE
        ========================================== */}
        <div className="sid-operator-table-card">

          <div className="sid-operator-table-wrapper">

            <table className="sid-operator-table">

              <thead>
                <tr>
                  <th>No. Surat</th>
                  <th className="center">Pemohon</th>
                  <th className="center">Jenis</th>
                  <th className="center">Tanggal</th>
                  <th className="center">RT / RW</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>

              <tbody>

                {loading ? (

                  <tr>
                    <td
                      colSpan={6}
                      className="sid-operator-table-message"
                    >
                      Memuat data surat...
                    </td>
                  </tr>

                ) : paginated.length === 0 ? (

                  <tr>
                    <td
                      colSpan={6}
                      className="sid-operator-table-message"
                    >
                      Belum ada surat.
                    </td>
                  </tr>

                ) : (

                  paginated.map((s) => {

                    const badge =
                      STATUS_LABEL[s.status] ?? {
                        label: s.status,
                        className:
                          "sid-status-default",
                      };

                    return (
                      <tr key={s.id}>

                        {/* NO SURAT */}
                        <td className="sid-operator-letter-number">

                          <div>
                            <span>
                              #{s.letter_number ?? "-"}
                            </span>

                            {s.revision_count > 0 && (
                              <small>
                                Hasil Revisi
                              </small>
                            )}
                          </div>

                        </td>

                        {/* PEMOHON */}
                        <td>
                          <span className="sid-operator-applicant">
                            {s.applicant_name}
                          </span>
                        </td>

                        {/* JENIS */}
                        <td className="center">
                          {s.letter_type?.name ?? "-"}
                        </td>

                        {/* TANGGAL */}
                        <td className="center">
                          {s.submitted_at
                            ? new Date(
                                s.submitted_at
                              ).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }
                              )
                            : "-"}
                        </td>

                        {/* RT / RW */}
                        <td>

                          <div className="sid-operator-approval">

                            {/* RT */}
                            <div>

                              <span>RT</span>

                              {[
                                "rt_approved",
                                "rw_approved",
                                "kasi_approved",
                                "rw_rejected",
                              ].includes(s.status) ? (

                                <div className="sid-operator-check approved">
                                  ✓
                                </div>

                              ) : s.status === "rt_rejected" ? (

                                <div className="sid-operator-check rejected">
                                  ✕
                                </div>

                              ) : (

                                <div className="sid-operator-check">
                                </div>

                              )}

                            </div>

                            {/* RW */}
                            <div>

                              <span>RW</span>

                              {[
                                "rw_approved",
                                "kasi_approved",
                              ].includes(s.status) ? (

                                <div className="sid-operator-check approved">
                                  ✓
                                </div>

                              ) : s.status === "rw_rejected" ? (

                                <div className="sid-operator-check rejected">
                                  ✕
                                </div>

                              ) : (

                                <div className="sid-operator-check">
                                </div>

                              )}

                            </div>

                          </div>

                        </td>

                        {/* AKSI */}
                        <td>

                          <div className="sid-operator-actions">

                            {/* Detail */}
                            <button
                              onClick={() =>
                                setPreviewSurat(s)
                              }
                              className="sid-operator-action detail"
                              title="Detail Surat"
                            >
                              <Eye size={17} />
                            </button>

                            {/* Edit */}
                            {s.status !== "kasi_approved" && (
                              <button
                                onClick={() =>
                                  setSelectedSurat(s)
                                }
                                className="sid-operator-action edit"
                                title="Edit Surat"
                              >
                                <Pencil size={17} />
                              </button>
                            )}

                            {/* Hapus */}
                            <button
                              onClick={() => {
                                setDeleteSurat(s);
                                setDeleteConfirmation("");
                              }}
                              className="sid-operator-action delete"
                              title="Hapus Surat"
                            >
                              <Trash2 size={17} />
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  })

                )}

              </tbody>

            </table>

          </div>

          {/* ==========================================
              PAGINATION
          ========================================== */}
          <div className="sid-operator-pagination">

            <p>
              Menampilkan{" "}
              {paginated.length === 0
                ? 0
                : (currentPage - 1) *
                    ITEMS_PER_PAGE +
                  1}
              -
              {(currentPage - 1) *
                ITEMS_PER_PAGE +
                paginated.length}{" "}
              dari {filtered.length} data
            </p>

            <div>

              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.max(1, p - 1)
                  )
                }
                disabled={currentPage === 1}
              >
                Sebelumnya
              </button>

              {Array.from(
                { length: totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() =>
                    setCurrentPage(page)
                  }
                  className={
                    page === currentPage
                      ? "active"
                      : ""
                  }
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(
                      totalPages,
                      p + 1
                    )
                  )
                }
                disabled={
                  currentPage === totalPages
                }
              >
                Selanjutnya
              </button>

            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <FooterOperator />

      {/* ==========================================
          PREVIEW
      ========================================== */}
      {previewSurat && (
        <OperatorSuratPreviewModal
          surat={previewSurat}
          onClose={() =>
            setPreviewSurat(null)
          }
        />
      )}

      {/* ==========================================
          ACTION MODAL
      ========================================== */}
      {selectedSurat && (
        <OperatorSuratActionModal
          surat={selectedSurat}
          onClose={() => {
            setSelectedSurat(null);
            loadLetters();
          }}
        />
      )}

      {/* ==========================================
          DELETE MODAL
      ========================================== */}
      {deleteSurat && (
        <div className="sid-operator-delete-overlay">

          <div className="sid-operator-delete-modal">

            {/* Header */}
            <div className="sid-operator-delete-header">

              <div className="sid-operator-delete-icon">
                <Trash2 size={20} />
              </div>

              <div>
                <h2>Hapus Surat</h2>

                <p>
                  Tindakan ini akan menghapus surat
                  dari sistem. Data yang sudah dihapus
                  tidak dapat dikembalikan.
                </p>
              </div>

            </div>

            {/* Informasi surat */}
            <div className="sid-operator-delete-info">

              <p>Surat yang akan dihapus</p>

              <strong>
                #{deleteSurat.letter_number ?? "-"}
              </strong>

              <span>
                {deleteSurat.applicant_name ?? "-"}
              </span>

              <span>
                {deleteSurat.letter_type?.name ?? "-"}
              </span>

            </div>

            {/* Instruksi */}
            <div className="sid-operator-delete-confirm">

              <label>
                Untuk melanjutkan, ketik
                <strong>DELETE</strong>
                di bawah ini.
              </label>

              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) =>
                  setDeleteConfirmation(
                    e.target.value
                  )
                }
                placeholder="Ketik DELETE"
                autoFocus
                disabled={deleting}
              />

              {deleteConfirmation &&
                deleteConfirmation !==
                  "DELETE" && (
                  <p>
                    Ketik{" "}
                    <strong>DELETE</strong>{" "}
                    persis seperti yang diminta.
                  </p>
                )}

            </div>

            {/* Buttons */}
            <div className="sid-operator-delete-actions">

              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteSurat(null);
                  setDeleteConfirmation("");
                }}
                className="cancel"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={
                  deleteConfirmation !==
                    "DELETE" || deleting
                }
                onClick={async () => {

                  if (
                    deleteConfirmation !==
                    "DELETE"
                  ) {
                    return;
                  }

                  try {

                    setDeleting(true);

                    await api.delete(
                      `/api/letters/${deleteSurat.id}`
                    );

                    setDeleteSurat(null);
                    setDeleteConfirmation("");

                    await loadLetters();

                  } catch (err) {

                    console.error(
                      "GAGAL HAPUS SURAT:",
                      err.response?.data ?? err
                    );

                    window.alert(
                      err.response?.data?.message ??
                        "Gagal menghapus surat."
                    );

                  } finally {

                    setDeleting(false);

                  }

                }}
                className="delete"
              >
                {deleting
                  ? "Menghapus..."
                  : "Hapus Surat"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}