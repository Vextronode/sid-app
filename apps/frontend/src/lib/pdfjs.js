// pdf.js berukuran besar; dimuat saat pratinjau PDF pertama kali dibuka
// supaya tidak ikut ke bundle halaman.
let pdfjsPromise = null

export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjsLib, worker]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default

      return pdfjsLib
    })
  }

  return pdfjsPromise
}
