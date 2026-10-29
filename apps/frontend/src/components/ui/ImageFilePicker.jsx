import { ImageOff, ImageUp } from 'lucide-react'

/**
 * Pemilih berkas gambar pengganti tombol "Choose file" bawaan peramban.
 * Input aslinya tetap ada (tersembunyi secara visual) di dalam label, jadi
 * klik, keyboard, dan pembaca layar tetap bekerja seperti input biasa.
 */
export default function ImageFilePicker({
  id,
  title,
  hint,
  onChange,
  disabled,
  accept = '.png,.jpg,.jpeg,.webp',
}) {
  return (
    <label className="sid-image-picker" htmlFor={id} aria-disabled={disabled || undefined}>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sid-image-picker-input"
        aria-labelledby={`${id}-title`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={onChange}
        disabled={disabled}
      />

      <span className="sid-image-picker-icon" aria-hidden="true">
        <ImageUp size={18} />
      </span>

      <span className="sid-image-picker-text">
        <span id={`${id}-title`} className="sid-image-picker-title">
          {title}
        </span>
        {hint && (
          <span id={`${id}-hint`} className="sid-image-picker-hint">
            {hint}
          </span>
        )}
      </span>
    </label>
  )
}

/**
 * Bingkai pratinjau bertinggi tetap. Gambar atau keterangan kosong berada di
 * tengahnya, sehingga kartu yang sudah dan belum terisi sama tinggi.
 */
export function ImagePreviewStage({ src, alt, emptyText = 'Belum diunggah', cover = false }) {
  return (
    <div className="sid-image-stage">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`sid-image-stage-img${cover ? ' sid-image-stage-img--cover' : ''}`}
        />
      ) : (
        <span className="sid-image-stage-empty">
          <ImageOff size={20} aria-hidden="true" />
          {emptyText}
        </span>
      )}
    </div>
  )
}
