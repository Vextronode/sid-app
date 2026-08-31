export function MainContent({ berita }) {
  return (
    <div className="sid-berita-detail-main">
      {/* Judul */}
      <h1 className="sid-berita-detail-title">
        {berita.title}
      </h1>

      {/* Image */}
      <div className="sid-berita-detail-image-wrapper">
        <img
          src={berita.imageUrl}
          alt={berita.title}
          className="sid-berita-detail-image"
        />
      </div>

      {/* Card Deskripsi */}
      <div className="sid-berita-detail-description">
        <h3 className="sid-berita-detail-description-title">
          Deskripsi
        </h3>

        <div className="sid-berita-detail-content">
          {berita.content?.map((text, idx) => (
            <p key={idx}>{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}