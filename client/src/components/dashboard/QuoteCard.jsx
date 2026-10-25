// A warm note for the day, with a small hand-drawn cup of tea
export default function QuoteCard({ quote }) {
  return (
    <section className="card quote-card" aria-label="A note for today">
      <svg className="quote-card__art" viewBox="0 0 64 64" aria-hidden="true">
        <path className="quote-card__line" d="M14 26 h30 v14 a13 13 0 0 1 -13 13 h-4 a13 13 0 0 1 -13 -13 Z" />
        <path className="quote-card__line" d="M44 30 h4 a6 6 0 0 1 0 12 h-5" />
        <path className="quote-card__line" d="M10 58 h38" />
        <path className="quote-card__heart" d="M29 20 c-3 -3 -8 -1 -6 4 c1 2 4 4 6 6 c2 -2 5 -4 6 -6 c2 -5 -3 -7 -6 -4 Z" />
      </svg>
      <div>
        <p className="quote-card__quote">{quote}</p>
        <p className="quote-card__sub">Thank you for being here today.</p>
      </div>
    </section>
  );
}
