import { useId } from 'react'

// Marca "Sapien" — forma "COR" do manual, em ROXO: quadrado arredondado com o
// gradiente indigo→violeta, as duas arcadas em branco e os sorrisos no gradiente
// por cima. Recriada como SVG a partir da logo enviada.
export function LogoMark({
  size = 32,
  className = ''
}: {
  size?: number
  className?: string
}): JSX.Element {
  const uid = useId().replace(/:/g, '')
  const grad = `sapien-grad-${uid}`
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
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="22" fill={`url(#${grad})`} />
      {/* arcadas brancas */}
      <path d="M26 71 L26 39 A11 11 0 0 1 48 39 L48 71 Z" fill="#fff" />
      <path d="M52 71 L52 39 A11 11 0 0 1 74 39 L74 71 Z" fill="#fff" />
      {/* sorrisos no gradiente por cima */}
      <path d="M32 53 Q37 58.5 42 53" fill="none" stroke={`url(#${grad})`} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M58 53 Q63 58.5 68 53" fill="none" stroke={`url(#${grad})`} strokeWidth="3.4" strokeLinecap="round" />
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
