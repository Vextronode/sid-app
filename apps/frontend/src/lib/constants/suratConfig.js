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


  A05: {
    code: "A05",
    title: "Surat Keterangan Tidak Mampu",
    type: "Manual",

    fields:[
      {
        name:"keperluan_persyaratan",
        label:"Keperluan",
        type:"textarea",
        required:true,
        placeholder:
          "Jelaskan keperluan SKTM"
      },

      {
        name:"dokumen",
        label:"Upload Dokumen Pendukung",
        type:"file",
        required:true,
        accept:
          ".pdf,.jpg,.jpeg,.png"
      }
    ]
  },


  A09:{
    code:"A09",
    title:"Surat Keterangan Belum Menikah",
    type:"Manual",

    fields:[
      {
        name:"keperluan",
        label:"Keperluan",
        type:"textarea",
        required:true,
        placeholder:
          "Jelaskan keperluan surat"
      },

      {
        name:"dokumen",
        label:"Upload Dokumen Pendukung",
        type:"file",
        required:true,
        accept:
          ".pdf,.jpg,.jpeg,.png"
      }
    ]
  },


};