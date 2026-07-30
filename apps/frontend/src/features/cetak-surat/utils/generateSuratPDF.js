// ==========================================
// generateSuratPDF.js
// Generate PDF surat dari backend seeder template
// ==========================================

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Download PDF dari backend
export function generateSuratPDF(surat) {
  const url = `${API_URL}/api/letters/${surat.id}/download`;

  fetch(url, {
    method: 'GET',
    credentials: 'include', // Kirim cookies otomatis
    headers: {
      'Accept': 'application/pdf',
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then(text => {
          console.error(`HTTP ${response.status}:`, text);
          throw new Error(`${response.status} ${response.statusText}: ${text}`);
        });
      }
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `surat_${surat.letter_type?.name ?? 'surat'}_${(surat.applicant_name ?? 'pemohon').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch((error) => {
      console.error('Error downloading PDF:', error);
      alert('Gagal mengunduh surat:\n' + error.message);
    });
}

// Preview PDF di tab baru dari backend
export async function previewSuratPDF(surat) {
  const url = `${API_URL}/api/letters/${surat.id}/preview`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/pdf",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  const blob = await response.blob();

  return window.URL.createObjectURL(blob);
}

// TTD Digital: untuk signature yang ditampilkan di backend
export function generateSuratPDFWithSignature(surat, signatureDataUrl) {
  // Untuk fitur signature, masih menggunakan download endpoint
  // Signature handling akan dilakukan di backend
  generateSuratPDF(surat);
}