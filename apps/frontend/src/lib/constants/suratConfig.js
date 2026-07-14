export const SURAT_CONFIG = {
  SKD: {
    code: "SKD",
    title: "Surat Keterangan Domisili",
    type: "Document",
    fields: [
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder: "Jelaskan keperluan pengajuan surat....",
      },
      {
        name: "dokumen",
        label: "Uplod Dokumen Pendukung",
        type: "file",
        required: true,
        accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
      },
      {
        name: "catatan",
        label: "Catatan Tambahan",
        type: "textarea",
        required: false,
        placeholder: "Opsional",
      },
    ],
  },
  SKU: {
    code: "SKU",
    title: "Surat Keterangan Usaha",
    type: "Manual",
    fields: [
      {
        name: "namaUsaha",
        label: "Nama Usaha",
        type: "text",
        required: true,
        placeholder: "Masukkan nama usaha Anda",
      },
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder: "Jelaskan keperluan pengajuan surat....",
      },
      {
        name: "dokumen",
        label: "Uplod Dokumen Pendukung",
        type: "file",
        required: true,
        accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
      },
    ],
  },
  // nanti tambahin surat lain disini ya, tapi khusus form yg diisi aja. buat yg disabled ato otomatis keisi gaperlu di taro disini
};
