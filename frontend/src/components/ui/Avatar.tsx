interface AvatarProps {
  nom: string;
  photoUrl?: string | null;
  size?: number;
}

const COLORS = ['#1E2D4A', '#2B4C7E', '#C9952A', '#15803D', '#6B5B95', '#8C6D3F', '#3D6B7A', '#9C5B3B'];

function getInitials(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorIndex(nom: string): number {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = (hash + nom.charCodeAt(i)) % COLORS.length;
  return hash;
}

export function Avatar({ nom, photoUrl, size = 28 }: AvatarProps) {
  const bg = nom ? COLORS[getColorIndex(nom)] : COLORS[0];
  const initials = nom ? getInitials(nom) : '?';
  return (
    <div
      aria-label={nom}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: size * 0.36,
        fontWeight: 700,
        flexShrink: 0,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : initials}
    </div>
  );
}
