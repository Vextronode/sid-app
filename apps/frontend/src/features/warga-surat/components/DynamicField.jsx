// ==========================================
// DynamicField.jsx
// Render satu field form sesuai tipe-nya (text/textarea/date), dipakai
// AjukanSuratForm untuk menampilkan field spesifik tiap jenis surat.
// ==========================================

export default function DynamicField({ field, value, onChange }) {
  const commonClass = 'w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500';

  return (
    <div className="flex flex-col gap-1 mb-4">
      <label className="text-xs text-gray-500">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          required={field.required}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`${commonClass} resize-none`}
        />
      ) : field.type === 'date' ? (
        <input
          type="date"
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={commonClass}
        />
      ) : (
        <input
          type="text"
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={commonClass}
        />
      )}
    </div>
  );
}