interface CardShowcaseProps {
  frontImage: string | null;
  backImage: string | null;
  side: 'FRONT' | 'BACK';
  memberName: string;
}

export function CardShowcase({ frontImage, backImage, side, memberName }: CardShowcaseProps) {
  const alt = `Kartu membership ${memberName}`;

  return (
    <div className="card-stage">
      <div className={`card-flip ${side === 'BACK' ? 'is-back' : ''}`}>
        <div className="card-face card-face-front">
          {frontImage ? (
            <img src={frontImage} alt={`${alt} — sisi depan`} />
          ) : (
            <div className="card-placeholder">Memuat kartu…</div>
          )}
          <span className="card-shine" aria-hidden />
        </div>

        <div className="card-face card-face-back">
          {backImage ? (
            <img src={backImage} alt={`${alt} — sisi belakang`} />
          ) : (
            <div className="card-placeholder">Memuat kartu…</div>
          )}
          <span className="card-shine" aria-hidden />
        </div>

        <span className="card-shadow" aria-hidden />
      </div>
    </div>
  );
}
