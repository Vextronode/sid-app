import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";

import { LIST_SURAT_GLOBAL } from "@/lib/constants/suratList";

import { CheckCircle2, ChevronDown } from "lucide-react";

import { useSubmitSurat } from "../hooks/useSubmitSurat";
import { useLetterTypes } from "../hooks/useLetterTypes";

import { AutoFillProfile } from "./AutoFillProfile";
import { FileUploader } from "./FileUploader";


export function DynamicSuratForm({
  config,
  onCancel,
  onSubmit,
  initialData = {},
  onSubmitAPI = null,
}) {

  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialData);
  const [uploadedFiles, setUploadedFiles] = useState({});

  const {
    handleSubmit: submitSurat,
    loading,
  } = useSubmitSurat();

  const letterTypes = useLetterTypes();


  // ==========================================
  // CHANGE FIELD
  // ==========================================

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  // ==========================================
  // FILE CHANGE
  // ==========================================

  const handleFileChange = (e, name) => {

    const files = Array.from(e.target.files);

    if (files.length) {

      setUploadedFiles((prev) => {

        const newFiles = [
          ...(prev[name] || []),
          ...files,
        ];

        handleChange(
          name,
          newFiles
        );

        return {
          ...prev,
          [name]: newFiles,
        };

      });

    }

  };


  // ==========================================
  // REMOVE FILE
  // ==========================================

  const handleRemoveFile = (
    e,
    name,
    index
  ) => {

    e.stopPropagation();

    setUploadedFiles((prev) => {

      const updated = [
        ...(prev[name] || []),
      ];

      updated.splice(index, 1);

      if (updated.length === 0) {

        const copy = {
          ...prev,
        };

        delete copy[name];

        handleChange(
          name,
          null
        );

        return copy;

      }

      handleChange(
        name,
        updated
      );

      return {
        ...prev,
        [name]: updated,
      };

    });

  };


  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (
      !Array.isArray(letterTypes) ||
      letterTypes.length === 0
    ) {
      alert("Jenis surat masih dimuat.");
      return;
    }

    const selectedLetterType = letterTypes.find(
      (item) => item.code === config.code
    );

    if (!selectedLetterType) {
      alert("Jenis surat tidak ditemukan.");
      return;
    }

    const payload = new FormData();


    // ========================================
    // FIELD LETTERS
    // ========================================

    payload.append(
      "letter_type_id",
      selectedLetterType.id
    );


    // Keperluan
    if (formData.keperluan) {
      payload.append(
        "purpose",
        formData.keperluan
      );
    }


    // Catatan
    if (formData.catatan) {
      payload.append(
        "notes",
        formData.catatan
      );
    }


    // ========================================
    // ATTACHMENTS
    // ========================================

    if (Array.isArray(formData.dokumen)) {

      formData.dokumen.forEach((file) => {

        payload.append(
          "attachments[]",
          file
        );

      });

    }


    // ========================================
    // DYNAMIC PAYLOAD
    // ========================================

    Object.keys(formData).forEach((key) => {

      if (
        ![
          "keperluan",
          "catatan",
          "dokumen",
        ].includes(key)
      ) {

        const val = formData[key];

        if (
          val !== undefined &&
          val !== null &&
          !(val instanceof File) &&
          !Array.isArray(val)
        ) {

          payload.append(
            `payload[${key}]`,
            val
          );

        }

      }

    });


    // ========================================
    // SEND
    // ========================================

    try {

      let response;

      if (onSubmitAPI) {

        response = await onSubmitAPI(
          payload
        );

      } else {

        response = await submitSurat(
          payload
        );

      }

      onSubmit?.(response);

    } catch (error) {

      console.error(error);

      alert(
        error.response?.data?.message ??
        "Gagal mengirim surat."
      );

    }

  };


  // ==========================================
  // RENDER
  // ==========================================

  return (

    <form
      onSubmit={handleSubmit}
      className="sid-card w-full"
    >


      {/* ======================================
          LANGKAH 1
          ====================================== */}

      <section className="sid-section">

        <h3 className="sid-section-title">
          Langkah 1 - Pilih Jenis Surat
        </h3>


        {/* JENIS SURAT */}

        <div className="sid-form-group">

          <label className="sid-label">

            Jenis surat{" "}

            <span className="sid-required">
              *
            </span>

          </label>


          <div className="relative">

            <select
              value={config.code}
              onChange={(e) =>
                navigate(
                  `/pengajuan-surat/${e.target.value}`
                )
              }
              className="sid-select appearance-none pr-10"
            >

              {LIST_SURAT_GLOBAL.map(
                (surat) => (

                  <option
                    key={surat.code}
                    value={surat.code}
                  >
                    {surat.name}
                  </option>

                )
              )}

            </select>


            <ChevronDown
              size={18}
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                pointer-events-none
              "
              style={{
                color: "var(--sid-primary)",
              }}
            />

          </div>

        </div>


        {/* VERIFIKASI */}

        <div className="sid-info">

          <CheckCircle2
            size={16}
          />

          <span>

            Verifikasi:{" "}

            <strong>
              {config.type}
            </strong>

          </span>

        </div>

      </section>


      {/* ======================================
          LANGKAH 2
          ====================================== */}

      <section className="sid-section">

        <h3 className="sid-section-title">
          Langkah 2 - Isi Form
        </h3>


        {/* AUTO PROFILE */}

        <AutoFillProfile
          user={user}
        />


        {/* DYNAMIC FIELDS */}

        <div
          className="
            flex
            flex-col
            gap-4
            pt-4
            border-t
          "
          style={{
            borderColor:
              "var(--sid-border)",
          }}
        >

          {config.fields.map(
            (field) => (

              <div
                key={field.name}
                className="sid-form-group"
              >


                {/* LABEL */}

                <label className="sid-label">

                  {field.label}

                  {field.required && (

                    <span className="sid-required">
                      {" "}*
                    </span>

                  )}

                </label>


                {/* TEXTAREA */}

                {field.type === "textarea" && (

                  <textarea
                    value={
                      formData[field.name] || ""
                    }
                    required={field.required}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      handleChange(
                        field.name,
                        e.target.value
                      )
                    }
                    className="sid-textarea"
                  />

                )}


                {/* TEXT */}

                {field.type === "text" && (

                  <input
                    type="text"
                    value={
                      formData[field.name] || ""
                    }
                    required={field.required}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      handleChange(
                        field.name,
                        e.target.value
                      )
                    }
                    className="sid-input"
                  />

                )}


                {/* FILE */}

                {field.type === "file" && (

                  <FileUploader
                    field={field}
                    files={
                      uploadedFiles[field.name]
                    }
                    onFileChange={
                      handleFileChange
                    }
                    onRemoveFile={
                      handleRemoveFile
                    }
                  />

                )}


                {/* DATE */}

                {field.type === "date" && (

                  <input
                    type="date"
                    value={
                      formData[field.name] || ""
                    }
                    required={field.required}
                    onChange={(e) =>
                      handleChange(
                        field.name,
                        e.target.value
                      )
                    }
                    className="sid-input"
                  />

                )}

              </div>

            )
          )}

        </div>

      </section>


      {/* ======================================
          ACTION
          ====================================== */}

      <div
        className="sid-actions pt-4 border-t"
        style={{
          borderColor:
            "var(--sid-border)",
        }}
      >

        {/* BATAL */}

        <button
          type="button"
          onClick={onCancel}
          className="sid-btn sid-btn-secondary"
        >
          Batal
        </button>


        {/* KIRIM */}

        <button
          type="submit"
          disabled={loading}
          className="sid-btn sid-btn-primary"
        >
          {loading
            ? "Mengirim..."
            : "Kirim"}
        </button>

      </div>

    </form>

  );

}