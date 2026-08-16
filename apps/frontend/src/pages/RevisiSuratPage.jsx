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

  useEffect(() => {
    const fetchSurat = async () => {
      try {
        const response = await api.get(`/api/letters/${id}`);
        const data = response.data.data;
        if (data.status !== "waiting_revision_warga") {
          setError("Surat ini tidak sedang dalam status revisi warga.");
        } else {
          setSurat(data);
        }
      } catch (err) {
        console.error(err);
        setError("Gagal mengambil data surat.");
      } finally {
        setLoading(false);
      }
    };
    fetchSurat();
  }, [id]);

  const handleCancel = () => navigate("/daftar-surat-saya?status=ditolak");

  const handleSubmit = () => {
    navigate("/daftar-surat-saya?status=approved"); 
    // Wait, the status changes to rw_approved. So it will go to "Diproses" which is not in `approved`. It will be on the main tab.
    navigate("/daftar-surat-saya");
  };

  const submitResubmitAPI = async (payload) => {
    payload.append('_method', 'PATCH');
    return api.post(`/api/letters/${id}/resubmit`, payload, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  };

  if (loading) {
    return (
      <WargaLayout>
        <div className="min-h-screen bg-gray-50/50 py-6 px-4 flex items-center justify-center">
          <p className="text-gray-500">Memuat data surat...</p>
        </div>
      </WargaLayout>
    );
  }

  if (error || !surat) {
    return (
      <WargaLayout>
        <div className="min-h-screen bg-gray-50/50 py-6 px-4 flex items-center justify-center">
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
            {error || "Surat tidak ditemukan."}
          </div>
        </div>
      </WargaLayout>
    );
  }

  const currentConfig = Object.values(SURAT_CONFIG).find(
    (cfg) => cfg.id === surat.letter_type_id || cfg.code === surat.letter_type?.code
  ) || SURAT_CONFIG[surat.letter_type?.code];

  if (!currentConfig) {
    return (
      <WargaLayout>
        <div className="min-h-screen bg-gray-50/50 py-6 px-4 flex items-center justify-center">
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
            Konfigurasi jenis surat tidak ditemukan.
          </div>
        </div>
      </WargaLayout>
    );
  }

  const initialData = {
    ...surat.payload,
    keperluan: surat.purpose,
    catatan: surat.notes, // Maybe empty or filled by Warga before
  };

  return (
    <WargaLayout>
      <div className="min-h-screen bg-gray-50/50 py-6 px-4 flex flex-col justify-between">
        <main className="max-w-3xl mx-auto w-full grow space-y-6">
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-800">Revisi Surat #{surat.letter_number || id}</h1>
            <p className="text-xs text-gray-400 mt-1">
              Perbarui formulir di bawah ini sesuai dengan catatan dari Operator Desa.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-blue-800 uppercase mb-1">Catatan Revisi dari Operator:</h3>
            <p className="text-sm text-blue-900">{surat.status_logs?.find(log => log.new_status === 'waiting_revision_warga')?.reason || surat.notes || "Silakan perbaiki data permohonan."}</p>
          </div>

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
