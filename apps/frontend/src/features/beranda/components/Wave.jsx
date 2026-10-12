// Motif gelombang terasering (02-design-tokens.md, path dari reference/mockup.html).
// Dekoratif saja. Warna diatur lewat kelas di beranda.css, bukan atribut fill.

const HERO_LAYERS = [
  { d: 'M0 40 C 240 10, 480 70, 720 40 S 1200 10, 1440 40 V90 H0 Z', opacity: 0.35 },
  { d: 'M0 58 C 260 30, 520 86, 760 58 S 1220 30, 1440 58 V90 H0 Z', opacity: 0.6 },
  { d: 'M0 74 C 280 52, 540 98, 800 74 S 1240 52, 1440 74 V90 H0 Z', opacity: 1 },
]

const FOOTER_PATH = 'M0 30 C 240 0, 480 56, 720 28 S 1200 0, 1440 30 V60 H0 Z'

/** variant "hero": tiga lapis di tepi bawah hero; "footer": satu lapis di tepi atas footer. */
export function Wave({ variant }) {
  if (variant === 'hero') {
    return (
      <svg
        className="bd-wave bd-wave--hero"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {HERO_LAYERS.map((layer) => (
          <path key={layer.d} d={layer.d} fillOpacity={layer.opacity} />
        ))}
      </svg>
    )
  }

  return (
    <svg
      className="bd-wave bd-wave--footer"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={FOOTER_PATH} />
    </svg>
  )
}
