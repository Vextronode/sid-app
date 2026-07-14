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
    <div className="space-y-2">
      <input
        type="file"
        multiple
        ref={inputRef}
        required={field.required && files.length === 0}
        accept={field.accept}
        onChange={(e) => onFileChange(e, field.name)}
        className="hidden"
      />

      {/* Render file" yg udah di upload */}
      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 border border-[#4CAF4F]/50 rounded-xl transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#E8F5E9] text-[#4CAF4F] rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-800 max-w-45 md:max-w-xs truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handleRemove(e, index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Hapus file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drag n ddrop */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-gray-200 border-dashed rounded-2xl p-6 text-center hover:bg-gray-50/50 hover:border-[#4CAF4F] transition cursor-pointer space-y-2"
      >
        <UploadCloud className="w-10 h-10 text-gray-400 mx-auto" />
        <p className="text-xs font-semibold text-gray-600">
          Klik untuk upload dokumen {files.length > 0 && "tambahan"}
        </p>
        <p className="text-[10px] text-gray-400">
          PDF, DOCX, JPG, PNG - maks. 5MB per file
        </p>
      </div>
    </div>
  );
}
