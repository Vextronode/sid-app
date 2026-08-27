import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { SURAT_CONFIG } from "@/lib/constants/suratConfig";
import { DynamicSuratForm } from "@/features/surat/components/DynamicSuratForm";
import { WargaLayout } from "@/components/layout/WargaLayout";
import api from "@/lib/api";


export function RevisiSuratPage() {

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [surat, setSurat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // ==========================================
  // GET DATA SURAT
  // ==========================================

  useEffect(() => {

    const fetchSurat = async () => {

      try {

        const response = await api.get(
          `/api/letters/${id}`
        );

        const data = response.data.data;

        if (
          data.status !==
          "waiting_revision_warga"
        ) {

          setError(
            "Surat ini tidak sedang dalam status revisi warga."
          );

        } else {

          setSurat(data);

        }

      } catch (err) {

        console.error(err);

        setError(
          "Gagal mengambil data surat."
        );

      } finally {

        setLoading(false);

      }

    };

    fetchSurat();

  }, [id]);


  // ==========================================
  // CANCEL
  // ==========================================

  const handleCancel = () =>
    navigate(
      "/daftar-surat-saya?status=ditolak"
    );


  // ==========================================
  // SUBMIT SUCCESS
  // ==========================================

  const handleSubmit = () => {

    // Setelah revisi berhasil,
    // surat kembali masuk ke alur proses.
    navigate("/daftar-surat-saya");

  };


  // ==========================================
  // RESUBMIT API
  // ==========================================

  const submitResubmitAPI = async (payload) => {

    payload.append("_method", "PATCH");

    return api.post(
      `/api/letters/${id}/resubmit`,
      payload,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );

  };


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {

    return (
      <WargaLayout>

        <div className="sid-page-state">

          <p className="sid-page-state-text">
            Memuat data surat...
          </p>

        </div>

      </WargaLayout>
    );

  }


  // ==========================================
  // ERROR
  // ==========================================

  if (error || !surat) {

    return (
      <WargaLayout>

        <div className="sid-page-state">

          <div className="sid-page-alert error">
            {error ||
              "Surat tidak ditemukan."}
          </div>

        </div>

      </WargaLayout>
    );

  }


  // ==========================================
  // SURAT CONFIG
  // ==========================================

  const currentConfig =
    Object.values(SURAT_CONFIG).find(
      (cfg) =>
        cfg.id === surat.letter_type_id ||
        cfg.code === surat.letter_type?.code
    ) ||
    SURAT_CONFIG[
      surat.letter_type?.code
    ];


  // ==========================================
  // CONFIG NOT FOUND
  // ==========================================

  if (!currentConfig) {

    return (
      <WargaLayout>

        <div className="sid-page-state">

          <div className="sid-page-alert error">
            Konfigurasi jenis surat
            tidak ditemukan.
          </div>

        </div>

      </WargaLayout>
    );

  }


  // ==========================================
  // INITIAL DATA
  // ==========================================

  const initialData = {
    ...surat.payload,

    keperluan:
      surat.purpose,

    catatan:
      surat.notes,
  };


  // ==========================================
  // RENDER
  // ==========================================

  return (
    <WargaLayout>

      <div className="sid-page sid-revision-page">

        <main className="sid-revision-content">


          {/* ==================================
              HEADER
          ================================== */}

          <div className="sid-revision-header">

            <h1 className="sid-page-title">
              Revisi Surat #
              {surat.letter_number || id}
            </h1>

            <p className="sid-page-description">
              Perbarui formulir di bawah ini
              sesuai dengan catatan dari
              Operator Desa.
            </p>

          </div>


          {/* ==================================
              CATATAN REVISI
          ================================== */}

          <div className="sid-revision-note">

            <h3 className="sid-revision-note-title">
              Catatan Revisi dari Operator:
            </h3>

            <p className="sid-revision-note-text">

              {surat.status_logs?.find(
                (log) =>
                  log.new_status ===
                  "waiting_revision_warga"
              )?.reason ||
                surat.notes ||
                "Silakan perbaiki data permohonan."}

            </p>

          </div>


          {/* ==================================
              FORM
          ================================== */}

          <DynamicSuratForm
            config={currentConfig}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            initialData={initialData}
            onSubmitAPI={submitResubmitAPI}
          />

        </main>

      </div>

    </WargaLayout>
  );
}