import { useRef } from 'react'
import { UploadCloud, FileText, Trash2 } from 'lucide-react'

export function FileUploader({ field, files = [], onFileChange, onRemoveFile }) {
  const inputRef = useRef(null)

  const handleRemove = (e, index) => {
    onRemoveFile(e, field.name, index)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="sid-form-group">
      <input
        type="file"
        multiple
        ref={inputRef}
        accept={field.accept}
        onChange={(e) => onFileChange(e, field.name)}
        className="sid-upload-input"
      />

      {files.length > 0 && (
        <div className="sid-upload-file-list">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="sid-upload-file">
              <div className="sid-upload-file-info">
                <div className="sid-upload-file-icon">
                  <FileText className="sid-upload-file-icon-svg" />
                </div>

                <div className="sid-upload-file-details">
                  <p className="sid-upload-file-name" title={file.name}>
                    {file.name}
                  </p>

                  <p className="sid-upload-file-size">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleRemove(e, index)}
                className="sid-upload-file-remove"
                title="Hapus file"
                aria-label={`Hapus ${file.name}`}
              >
                <Trash2 className="sid-upload-file-remove-icon" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div onClick={() => inputRef.current?.click()} className="sid-upload">
        <UploadCloud className="sid-upload-icon" />

        <p className="sid-upload-title">
          Klik untuk upload dokumen {files.length > 0 && 'tambahan'}
        </p>

        <p className="sid-upload-description">PDF, DOCX, JPG, PNG - maks. 5MB per file</p>
      </div>
    </div>
  )
}
