export function InformasiUmum({ data }) {
  return (
    <div className="sid-card sid-info-card">
      <h3 className="sid-info-card__title">
        Informasi Umum
      </h3>

      <div className="sid-info-card__content">
        {Object.entries(data).map(([key, value]) => (
          <div
            key={key}
            className="sid-info-card__row"
          >
            <span className="sid-info-card__label">
              {key.replace(/([A-Z])/g, " $1")}
            </span>

            <span className="sid-info-card__value">
              : {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
