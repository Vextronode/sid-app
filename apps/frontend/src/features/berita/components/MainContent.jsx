// Isi detail berita. Gaya dari public.css (kelas pb-*).
export function MainContent({ berita }) {
  return (
    <article>
      <header className="pb-article-head">
        {(berita.categories?.length > 0 || berita.date) && (
          <div className="pb-meta">
            {berita.categories?.map((category) => (
              <span key={category} className="pb-chip">
                {category}
              </span>
            ))}
            {berita.date && <span>{berita.date}</span>}
          </div>
        )}
        <h1 className="pb-article-title">{berita.title}</h1>
      </header>

      {berita.imageUrl && (
        <div className="pb-article-image">
          <img src={berita.imageUrl} alt={berita.title} />
        </div>
      )}

      <div className="pb-article-body">
        {berita.content?.map((text, idx) => (
          <p key={idx}>{text}</p>
        ))}
      </div>
    </article>
  )
}
