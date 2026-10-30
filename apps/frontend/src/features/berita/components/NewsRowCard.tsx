import { Link } from "react-router-dom";

export function NewsRowCard({ data }) {
  return (
    <Link
      to={`/berita/${data.id}`}
      className="sid-news-row-card"
    >
      {/* Bagian Gambar */}
      <div className="sid-news-row-image">
        <img
          src={data.imageUrl}
          alt={data.title}
          className="sid-news-row-image-content"
        />
      </div>

      {/* Bagian Konten Teks */}
      <div className="sid-news-row-content">
        <div>
          {/* Judul */}
          <h3 className="sid-news-row-title">
            {data.title}
          </h3>

          {/* Deskripsi Singkat */}
          <p className="sid-news-row-description">
            {data.description}
          </p>
        </div>

        {/* Footer info di dalam card */}
        <div className="sid-news-row-meta">
          <span className="sid-news-row-category">
            {data.category}
          </span>

          <span className="sid-news-row-date">
            {data.date}
          </span>
        </div>
      </div>
    </Link>
  );
}