interface SkelProps {
  w?: number | string;
  h?: number | string;
  r?: number | string;
  style?: React.CSSProperties;
}

/** Bloc squelette générique (utilise .skeleton de index.css). */
export function Skeleton({ w = '100%', h = 14, r = 8, style }: SkelProps) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Carte squelette : avatar + deux lignes + une ligne d'action. */
export function SkeletonCard() {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton w={38} h={38} r="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton w="45%" h={13} />
          <Skeleton w="30%" h={11} style={{ marginTop: 7 }} />
        </div>
        <Skeleton w={64} h={22} r={999} />
      </div>
      <div style={{ marginLeft: 50, marginTop: 12 }}>
        <Skeleton w="70%" h={12} />
        <Skeleton w="55%" h={12} style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}

/** Liste de N cartes squelette. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/** En-tête de page squelette (titre + sous-titre). */
export function SkeletonHeader() {
  return (
    <div style={{ marginBottom: 22 }}>
      <Skeleton w={200} h={26} r={10} />
      <Skeleton w={140} h={13} style={{ marginTop: 8 }} />
    </div>
  );
}
