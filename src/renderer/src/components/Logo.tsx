import { useId } from 'react'

// Marca "Sapien": duas arcadas arredondadas (como dois livros/leitores) com um
// pequeno sorriso em cada. Recriada como SVG a partir da logo enviada, preenchida
// com o gradiente indigo→violeta do design. As "bocas" são recortes (máscara),
// então a marca funciona sobre qualquer fundo.
export function LogoMark({
  size = 32,
  className = ''
}: {
  size?: number
  className?: string
}): JSX.Element {
  const uid = useId().replace(/:/g, '')
  const grad = `sapien-grad-${uid}`
  const mask = `sapien-mask-${uid}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Sapien"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <mask id={mask}>
          {/* área visível (branco) — as duas arcadas */}
          <path d="M22 79 L22 45 A12 12 0 0 1 46 45 L46 79 Z" fill="#fff" />
          <path d="M54 79 L54 45 A12 12 0 0 1 78 45 L78 79 Z" fill="#fff" />
          {/* recortes (preto) — os dois sorrisos */}
          <path
            d="M29 60 Q34 66.5 39 60"
            fill="none"
            stroke="#000"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <path
            d="M61 60 Q66 66.5 71 60"
            fill="none"
            stroke="#000"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <rect width="100" height="100" fill={`url(#${grad})`} mask={`url(#${mask})`} />
    </svg>
  )
}

// Lockup completo: marca + wordmark "Sapien".
export function LogoLockup({
  size = 32,
  className = ''
}: {
  size?: number
  className?: string
}): JSX.Element {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-extrabold tracking-tight text-ink"
        style={{ fontSize: size * 0.5, letterSpacing: '-0.02em' }}
      >
        Sapien
      </span>
    </div>
  )
}
