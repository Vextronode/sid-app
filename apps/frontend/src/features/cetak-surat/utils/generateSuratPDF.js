// ==========================================
// generateSuratPDF.js
// Generate PDF surat resmi pakai jsPDF. Tiga mode:
// - generateSuratPDF: download file (TTD Basah — cetak manual, tanpa gambar ttd)
// - previewSuratPDF: buka PDF di tab baru, tanpa download
// - generateSuratPDFWithSignature: sama seperti generate, tapi menempelkan
//   gambar tanda tangan digital (base64 dari TtdDigitalModal) di posisi ttd
// ==========================================

import jsPDF from 'jspdf';

function buildSuratDoc(surat, signatureDataUrl = null) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('PEMERINTAH DESA CIBENDA', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Kecamatan Parigi, Kabupaten Pangandaran', 105, 26, { align: 'center' });
  doc.line(20, 30, 190, 30);

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text((surat.letter_type?.name ?? surat.jenis_label ?? '').toUpperCase(), 105, 42, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.text(`Nomor: ${surat.letter_number ?? surat.no_surat ?? '-'}`, 105, 48, { align: 'center' });

  let y = 62;
  const rows = [
    ['Nama', surat.applicant_name ?? surat.pemohon ?? '-'],
    ['NIK', surat.applicant_nik ?? surat.nik ?? '-'],
    ['Alamat', surat.applicant_address ?? surat.alamat ?? '-'],
    ['Keperluan', surat.purpose ?? surat.keperluan ?? '-'],
  ];
  rows.forEach(([label, value]) => {
    doc.text(`${label}`, 25, y);
    doc.text(`: ${value}`, 65, y);
    y += 8;
  });

  y += 10;
  doc.text('Demikian surat keterangan ini dibuat untuk digunakan sebagaimana mestinya.', 25, y, { maxWidth: 160 });

  y += 20;
  doc.text(`Cibenda, ${new Date().toLocaleDateString('id-ID')}`, 130, y);
  doc.text('Kepala Desa Cibenda', 130, y + 8);

  // Kalau ada tanda tangan digital, tempelkan gambarnya
  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, 'PNG', 128, y + 12, 45, 20);
    doc.setFontSize(8);
    doc.setTextColor(34, 139, 34);
    doc.text('✓ Ditandatangani secara digital', 130, y + 36);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    y += 42;
  } else {
    y += 35;
  }

  doc.text('H. Ade Supriatna', 130, y);

  return doc;
}

// TTD Basah: download file, siap dicetak & ditandatangani manual di kertas
export function generateSuratPDF(surat) {
  const doc = buildSuratDoc(surat);
  doc.save(`${surat.letter_type?.name ?? surat.jenis ?? 'surat'}_${(surat.applicant_name ?? surat.pemohon ?? 'pemohon').replace(/\s+/g, '_')}.pdf`);
}

// Preview tanpa download
export function previewSuratPDF(surat) {
  const doc = buildSuratDoc(surat);
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}

// TTD Digital: tempel gambar tanda tangan, lalu download
export function generateSuratPDFWithSignature(surat, signatureDataUrl) {
  const doc = buildSuratDoc(surat, signatureDataUrl);
  doc.save(`${surat.letter_type?.name ?? surat.jenis ?? 'surat'}_${(surat.applicant_name ?? surat.pemohon ?? 'pemohon').replace(/\s+/g, '_')}_ttd.pdf`);
}