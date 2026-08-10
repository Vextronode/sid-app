export const SURAT_CONFIG = {

  A04: {
    code: "A04",
    title: "Surat Keterangan Domisili",
    type: "Manual",

    fields: [
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan pengajuan surat....",
      },

      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },

      {
        name: "catatan",
        label: "Catatan Tambahan",
        type: "textarea",
        required: false,
        placeholder:
          "Opsional",
      },
    ],
  },


  A01: {
    code: "A01",
    title: "Surat Keterangan Usaha",
    type: "Manual",

    fields: [
      {
        name: "jenis_usaha",
        label: "Jenis Usaha",
        type: "text",
        required: true,
        placeholder:
          "Masukkan jenis usaha",
      },

      {
        name: "lokasi_usaha",
        label: "Lokasi Usaha",
        type: "text",
        required: true,
        placeholder:
          "Masukkan lokasi usaha",
      },

      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat",
      },

      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },
    ],
  },

  A02: {
    code: "A02",
    title: "Surat Keterangan Tidak Memiliki Rumah",
    type: "Manual",

    fields: [
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat",
      },
      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },
    ],
  },

  A03: {
    code: "A03",
    title: "Surat Keterangan Penghasilan",
    type: "Manual",

    fields: [
      {
        name: "jenis_usaha",
        label: "Jenis Usaha",
        type: "text",
        required: true,
        placeholder: "Masukkan jenis usaha",
      },
      {
        name: "penghasilan_perbulan",
        label: "Penghasilan per Bulan",
        type: "text",
        required: true,
        placeholder: "Rp 0.000.000",
      },
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat",
      },
      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },
    ],
  },

  A05: {
    code: "A05",
    title: "Surat Keterangan Tidak Mampu",
    type: "Manual",

    fields: [
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan SKTM"
      },

      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png"
      }
    ]
  },

  A06: {
    code: "A06",
    title: "Surat Keterangan Beda Nama",
    type: "Manual",

    fields: [
      {
        name: "nama_lama",
        label: "Nama Lama",
        type: "text",
        required: true,
        placeholder: "Tuliskan nama lama",
      },
      {
        name: "nama_benar",
        label: "Nama yang Benar",
        type: "text",
        required: true,
        placeholder: "Tuliskan nama yang benar",
      },
      {
        name: "sumber_dokumen",
        label: "Sumber Dokumen",
        type: "text",
        required: false,
        placeholder: "Contoh: akta/ijazah",
      },
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat",
      },
      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },
    ],
  },

  A07: {
    code: "A07",
    title: "Surat Keterangan Penguburan",
    type: "Manual",

    fields: [
      {
        name: "nama_almarhum",
        label: "Nama Alm.",
        type: "text",
        required: true,
        placeholder: "Tuliskan nama almarhum",
      },
      {
        name: "tanggal_meninggal",
        label: "Tanggal Meninggal",
        type: "date",
        required: true,
      },
      {
        name: "tempat_meninggal",
        label: "Tempat Meninggal",
        type: "text",
        required: true,
        placeholder: "Tuliskan tempat meninggal",
      },
      {
        name: "sebab",
        label: "Sebab Kematian",
        type: "text",
        required: false,
        placeholder: "Contoh: sakit / kecelakaan",
      },
      {
        name: "tempat_pemakaman",
        label: "Tempat Pemakaman",
        type: "text",
        required: true,
        placeholder: "Tuliskan tempat pemakaman",
      },
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat",
      },
      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },
    ],
  },

  A08: {
    code: "A08",
    title: "Surat Keterangan Kelahiran",
    type: "Manual",

    fields: [
      {
        name: "nama_ayah",
        label: "Nama Ayah",
        type: "text",
        required: true,
        placeholder: "Tuliskan nama ayah",
      },
      {
        name: "nik_ayah",
        label: "NIK Ayah",
        type: "text",
        required: true,
        placeholder: "****-****-0042",
      },
      {
        name: "nama_ibu",
        label: "Nama Ibu",
        type: "text",
        required: true,
        placeholder: "Tuliskan nama ibu",
      },
      {
        name: "nik_ibu",
        label: "NIK Ibu",
        type: "text",
        required: true,
        placeholder: "****-****-0042",
      },
      {
        name: "tempat_lahir_anak",
        label: "Tempat Lahir Anak",
        type: "text",
        required: true,
        placeholder: "Tuliskan tempat lahir anak",
      },
      {
        name: "tanggal_lahir_anak",
        label: "Tanggal Lahir Anak",
        type: "date",
        required: true,
      },
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat",
      },
      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },
    ],
  },

  A05: {
    code: "A05",
    title: "Surat Keterangan Tidak Mampu",
    type: "Manual",

    fields: [
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan SKTM"
      },

      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png"
      }
    ]
  },

  A09: {
    code: "A09",
    title: "Surat Keterangan Belum Menikah",
    type: "Manual",

    fields: [
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat"
      },

      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png"
      }
    ]
  },

  A10: {
    code: "A10",
    title: "Surat Keterangan & Pertama Kali Memiliki Rumah",
    type: "Manual",

    fields: [
      {
        name: "alamat_rumah",
        label: "Alamat Rumah",
        type: "text",
        required: true,
        placeholder: "Tuliskan alamat rumah",
      },
      {
        name: "keperluan",
        label: "Keperluan",
        type: "textarea",
        required: true,
        placeholder:
          "Jelaskan keperluan surat",
      },
      {
        name: "dokumen",
        label: "Upload Dokumen Pendukung",
        type: "file",
        required: true,
        accept:
          ".pdf,.jpg,.jpeg,.png",
      },
    ],
  },
};