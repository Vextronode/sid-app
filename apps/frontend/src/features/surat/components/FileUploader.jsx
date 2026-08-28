import { useRef } from "react";
import { UploadCloud, FileText, Trash2 } from "lucide-react";

export function FileUploader({
  field,
  files = [],
  onFileChange,
  onRemoveFile,
}) {
  const inputRef = useRef(null);

  const handleRemove = (e, index) => {
    onRemoveFile(e, field.name, index);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="sid-form-group">

      {/* =========================
          INPUT FILE
      ========================= */}
      <input
        type="file"
        multiple
        ref={inputRef}
        required={field.required && files.length === 0}
        accept={field.accept}
        onChange={(e) => onFileChange(e, field.name)}
        className="sid-upload-input"
      />


      {/* =========================
          FILE YANG SUDAH DIUPLOAD
      ========================= */}
      {files.length > 0 && (
        <div className="space-y-2">

          {files.map((file, index) => (
            <div
              key={index}
              className="
                flex
                items-center
                justify-between
                gap-3
                p-3
                sm:p-4
                bg-[#F7F6F1]
                border
                border-[var(--sid-border)]
                rounded-[var(--radius-md)]
                transition
              "
            >

              {/* INFO FILE */}
              <div className="flex items-center gap-3 min-w-0">

                <div
                  className="
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                    w-10
                    h-10
                    bg-[var(--sid-status-progress-bg)]
                    text-[var(--sid-primary)]
                    rounded-[var(--radius-sm)]
                  "
                >
                  <FileText className="w-5 h-5" />
                </div>


                <div className="text-left min-w-0">

                  <p
                    className="
                      text-xs
                      font-semibold
                      text-[var(--sid-text-primary)]
                      truncate
                      max-w-[180px]
                      sm:max-w-xs
                    "
                    title={file.name}
                  >
                    {file.name}
                  </p>

                  <p
                    className="
                      text-[10px]
                      text-[var(--sid-text-muted)]
                      mt-0.5
                    "
                  >
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>

                </div>

              </div>


              {/* HAPUS */}
              <button
                type="button"
                onClick={(e) => handleRemove(e, index)}
                className="
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                  w-8
                  h-8
                  rounded-[var(--radius-sm)]
                  border
                  border-transparent
                  text-[var(--sid-status-rejected-text)]
                  hover:bg-[var(--sid-status-rejected-bg)]
                  transition
                "
                title="Hapus file"
                aria-label={`Hapus ${file.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>

            </div>
          ))}

        </div>
      )}


      {/* =========================
          UPLOAD AREA
      ========================= */}
      <div
        onClick={() => inputRef.current?.click()}
        className="
          sid-upload
          w-full
        "
      >

        <UploadCloud
          className="
            w-10
            h-10
            text-[var(--sid-text-muted)]
          "
        />

        <p className="sid-upload-title">
          Klik untuk upload dokumen{" "}
          {files.length > 0 && "tambahan"}
        </p>

        <p className="sid-upload-description">
          PDF, DOCX, JPG, PNG - maks. 5MB per file
        </p>

      </div>

    </div>
  );
}