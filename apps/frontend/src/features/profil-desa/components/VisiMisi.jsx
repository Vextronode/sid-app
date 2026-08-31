export function VisiMisi({ visi, misi }) {
  return (
    <div className="sid-card sid-visi-misi-card">
      <div className="sid-visi-section">
        <h4 className="sid-visi-misi-title">
          Visi
        </h4>

        <p className="sid-visi-misi-text">
          {visi}
        </p>
      </div>

      <div className="sid-visi-section">
        <h4 className="sid-visi-misi-title">
          Misi
        </h4>

        <ul className="sid-visi-misi-list">
          {misi.map((item, idx) => (
            <li key={idx}>
              {idx + 1}. {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}