import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { LIST_SURAT_GLOBAL } from "@/lib/constants/suratList";
import { CheckCircle2, ChevronDown } from "lucide-react";

import { AutoFillProfile } from "./AutoFillProfile";
import { FileUploader } from "./FileUploader";

export function DynamicSuratForm({ config, onCancel, onSubmit }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, name) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setUploadedFiles((prev) => {
        const newFilesArray = [...(prev[name] || []), ...files];
        handleChange(name, newFilesArray);
        return { ...prev, [name]: newFilesArray };
      });
    }
  };

  const handleRemoveFile = (e, name, fileIndex) => {
    e.stopPropagation();
    setUploadedFiles((prev) => {
      const updatedList = [...(prev[name] || [])];
      updatedList.splice(fileIndex, 1);

      if (updatedList.length === 0) {
        const newState = { ...prev };
        delete newState[name];
        handleChange(name, null);
        return newState;
      }

      handleChange(name, updatedList);
      return { ...prev, [name]: updatedList };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      nama: user?.name,
      nik: user?.nik,
      alamat: user?.alamat,
      rtrw: user?.rtrw,
      ...formData,
      jenisSurat: config.title,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 md:p-10 rounded-2xl shadow-xl w-full border border-gray-100 space-y-8"
    >
      {/* pilih jenis surat */}
      <div className="space-y-3 text-left">
        <h3 className="text-xs font-extrabold text-gray-500 tracking-wider uppercase">
          Langkah 1 - Pilih Jenis Surat
        </h3>
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Jenis surat <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={config.code}
              onChange={(e) => navigate(`/pengajuan-surat/${e.target.value}`)}
              className="w-full px-4 py-3 bg-white border border-[#4CAF4F] text-[#4CAF4F] rounded-xl text-sm font-semibold focus:outline-none appearance-none cursor-pointer pr-10"
            >
              {LIST_SURAT_GLOBAL.map((surat) => (
                <option
                  key={surat.code}
                  value={surat.code}
                  className="text-gray-700"
                >
                  {surat.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#4CAF4F]">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex">
          <div className="bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32] text-[10px] md:text-xs px-4 py-2 rounded-full flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4CAF4F]" />
            <span>
              Jenis ini verifikasi <strong>{config.type.toLowerCase()}</strong>{" "}
              - wajib upload dokumen pendukung.
            </span>
          </div>
        </div>
      </div>

      {/* Isis form */}
      <div className="space-y-5 text-left">
        <h3 className="text-xs font-extrabold text-gray-500 tracking-wider uppercase">
          Langkah 2 - Isi Form
        </h3>

        {/* Auto fill prpfile form */}
        <AutoFillProfile user={user} />

        <div className="space-y-4 pt-4 border-t border-gray-100">
          {config.fields.map((field) => (
            <div key={field.name} className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                {field.label}{" "}
                {field.required && <span className="text-red-500">*</span>}
              </label>

              {field.type === "textarea" && (
                <textarea
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/35 focus:border-[#4CAF4F] transition placeholder-gray-400"
                />
              )}

              {field.type === "text" && (
                <input
                  type="text"
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/35 focus:border-[#4CAF4F] transition placeholder-gray-400"
                />
              )}

              {/* FileUploadar */}
              {field.type === "file" && (
                <FileUploader
                  field={field}
                  files={uploadedFiles[field.name]}
                  onFileChange={handleFileChange}
                  onRemoveFile={handleRemoveFile}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 border border-[#4CAF4F] text-[#4CAF4F] rounded-xl text-xs md:text-sm font-bold hover:bg-[#4CAF4F]/5 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          className="flex-1 py-3 px-4 bg-[#4CAF4F] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#3d8c40] transition"
        >
          Submit Permohonan
        </button>
      </div>
    </form>
  );
}
