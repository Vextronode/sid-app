// ==========================================
// DynamicField.jsx
// Render satu field form sesuai tipe-nya (text/textarea/date), dipakai
// AjukanSuratForm untuk menampilkan field spesifik tiap jenis surat.
// ==========================================

export default function DynamicField({ field, value, onChange }) {
  return (
    <div className="sid-form-group">
      <label className="sid-label">
        {field.label}{' '}
        {field.required && (
          <span className="sid-required">*</span>
        )}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          required={field.required}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="sid-textarea"
        />
      ) : field.type === 'date' ? (
        <input
          type="date"
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sid-input"
        />
      ) : (
        <input
          type="text"
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="sid-input"
        />
      )}
    </div>
  );
}