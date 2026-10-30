export function PerangkatDesa({ listPerangkat }) {
  return (
    <div className="sid-card sid-perangkat-card">
      <h3 className="sid-perangkat-card__title">
        Perangkat Desa
      </h3>

      <div className="sid-perangkat-card__list">
        {listPerangkat.map((item, idx) => (
          <div
            key={idx}
            className="sid-perangkat-card__row"
          >
            <span className="sid-perangkat-card__jabatan">
              {item.jabatan}
            </span>

            <span className="sid-perangkat-card__nama">
              : {item.nama}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
