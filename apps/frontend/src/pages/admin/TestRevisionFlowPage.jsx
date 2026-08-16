import { useState } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getSuratList, approveSurat } from '@/features/approval/api';
import api from '@/lib/api';

export default function TestRevisionFlowPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testStep, setTestStep] = useState('view');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [resubmitData, setResubmitData] = useState({
    purpose: '',
    notes: '',
  });

  const loadLetters = async () => {
    setLoading(true);
    try {
      const role = user?.role === 'rt' ? 'rt' : user?.role === 'rw' ? 'rw' : 'kasi';
      const response = await getSuratList(role);
      setLetters(response.data ?? []);
    } catch (error) {
      console.error('Error loading letters:', error);
      alert('Gagal memuat daftar surat');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (action) => {
    if (!selectedLetter) return;

    setLoading(true);
    try {
      const role = user?.role === 'rt' ? 'rt' : user?.role === 'rw' ? 'rw' : 'kasi';
      await approveSurat(role, selectedLetter.id, action, actionNotes);
      alert(`Aksi "${action}" berhasil dilakukan`);
      setActionNotes('');
      setSelectedLetter(null);
      loadLetters();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message ?? 'Gagal melakukan aksi');
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!selectedLetter || !resubmitData.purpose) {
      alert('Mohon isi keperluan');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/api/letters/${selectedLetter.id}/resubmit`, resubmitData);
      alert('Surat berhasil dikirim ulang');
      setResubmitData({ purpose: '', notes: '' });
      setSelectedLetter(null);
      loadLetters();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message ?? 'Gagal mengirim ulang surat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Testing Alur Revisi Surat</h1>
        <p className="text-gray-600 mb-6">Halaman khusus untuk testing flow: create → approve RT → approve RW → minta revisi → resubmit → final approval</p>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setTestStep('view');
                loadLetters();
              }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                testStep === 'view' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1. Lihat Daftar Surat
            </button>
            <button
              onClick={() => setTestStep('action')}
              disabled={!selectedLetter}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                testStep === 'action' && selectedLetter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              2. Lakukan Aksi
            </button>
            <button
              onClick={() => setTestStep('resubmit')}
              disabled={selectedLetter?.status !== 'waiting_revision_warga'}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                testStep === 'resubmit' && selectedLetter?.status === 'waiting_revision_warga' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              3. Resubmit Revisi
            </button>
          </div>

          {/* Step 1: View Letters */}
          {testStep === 'view' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Daftar Surat</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : letters.length === 0 ? (
                <p className="text-gray-500">Tidak ada surat</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">ID</th>
                        <th className="text-left py-2 px-4">Jenis Surat</th>
                        <th className="text-left py-2 px-4">Pemohon</th>
                        <th className="text-left py-2 px-4">Status</th>
                        <th className="text-center py-2 px-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {letters.map((letter) => (
                        <tr key={letter.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{letter.id}</td>
                          <td className="py-3 px-4">{letter.letter_type?.name ?? '-'}</td>
                          <td className="py-3 px-4">{letter.applicant_name ?? '-'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                              {letter.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedLetter(letter);
                                setTestStep('action');
                              }}
                              className="text-blue-600 hover:underline text-sm font-medium"
                            >
                              Pilih
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Action */}
          {testStep === 'action' && selectedLetter && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Aksi untuk Surat #{selectedLetter.id}</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Jenis:</strong> {selectedLetter.letter_type?.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Pemohon:</strong> {selectedLetter.applicant_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status Saat Ini:</strong> <span className="font-medium">{selectedLetter.status}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Catatan (opsional)</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  placeholder="Tulis catatan untuk aksi ini..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleApprove('approved')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Setujui
                </button>
                <button
                  onClick={() => handleApprove('rejected')}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  ✗ Tolak
                </button>
                {user?.role === 'kasi_pelayanan' || user?.role === 'kaur_tu_umum' || user?.role === 'petugas_desa' ? (
                  <button
                    onClick={() => handleApprove('needs_revision')}
                    disabled={loading}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    ⟲ Minta Revisi
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Step 3: Resubmit */}
          {testStep === 'resubmit' && selectedLetter?.status === 'waiting_revision_warga' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">Resubmit Revisi - Surat #{selectedLetter.id}</h2>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-sm text-amber-800">
                  Surat ini sedang menunggu revisi dari warga. Isi form di bawah untuk melakukan resubmit.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Keperluan</label>
                <textarea
                  value={resubmitData.purpose}
                  onChange={(e) => setResubmitData({ ...resubmitData, purpose: e.target.value })}
                  rows={2}
                  placeholder="Keperluan surat..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Catatan Revisi</label>
                <textarea
                  value={resubmitData.notes}
                  onChange={(e) => setResubmitData({ ...resubmitData, notes: e.target.value })}
                  rows={3}
                  placeholder="Catatan untuk operator tentang revisi yang telah dilakukan..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleResubmit}
                  disabled={loading || !resubmitData.purpose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Kirim Ulang
                </button>
                <button
                  onClick={() => {
                    setSelectedLetter(null);
                    setResubmitData({ purpose: '', notes: '' });
                    setTestStep('view');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2">Catatan Testing:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc pl-5">
              <li>Jika role RT: bisa approve/reject dari status "pending"</li>
              <li>Jika role RW: bisa approve/reject dari status "rt_approved"</li>
              <li>Jika role Kasi/Kaur: bisa approve/reject/minta revisi dari status "rw_approved"</li>
              <li>Jika role Warga & surat status "waiting_revision_warga": bisa resubmit</li>
              <li>Setelah resubmit: surat kembali ke status "rw_approved" untuk verifikasi final</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
