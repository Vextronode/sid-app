// ==========================================
// generateSuratPDF.js
// Generate PDF surat dari backend seeder template
// ==========================================

import api from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// buka file PDF dari backend
export async function generateSuratPDF(surat, template = 'wet') {
  const url = `${API_URL}/api/letters/${surat.id}/download?template=${template}`;

  // Buka tab SEBELUM await agar tidak diblokir browser
  const pdfTab = window.open('', '_blank');

  if (!pdfTab) {
    throw new Error(
      'Popup diblokir browser. Silakan izinkan popup untuk website ini.'
    );
  }

  try {
    pdfTab.document.write(`
      <html>
        <head>
          <title>Memproses Surat...</title>
        </head>
        <body style="
          font-family: Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        ">
          <p>Memproses surat...</p>
        </body>
      </html>
    `);

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
      },
    });

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        `${response.status} ${response.statusText}: ${text}`
      );
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    pdfTab.location.href = blobUrl;

    // Jangan revoke terlalu cepat
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);

    return true;
  } catch (error) {
    pdfTab.close();
    throw error;
  }
}

// Preview PDF di tab baru dari backend
export async function previewSuratPDF(surat, template = 'wet') {
  const url = `${API_URL}/api/letters/${surat.id}/preview?template=${template}`;

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