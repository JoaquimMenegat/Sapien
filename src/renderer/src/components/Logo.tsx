// Marca "Sapien" — forma padrão do manual (tile "COR"): quadrado vermelho
// arredondado com as duas arcadas em branco e os sorrisos vermelhos (recortados
// por cima). Recriada como SVG a partir da logo enviada.
const SAPIEN_RED = '#E5342A'

export function LogoMark({
  size = 32,
  className = ''
}: {
  size?: number
  className?: string
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Sapien"
    >
      <rect x="4" y="4" width="92" height="92" rx="22" fill={SAPIEN_RED} />
      {/* arcadas brancas */}
      <path d="M26 71 L26 39 A11 11 0 0 1 48 39 L48 71 Z" fill="#fff" />
      <path d="M52 71 L52 39 A11 11 0 0 1 74 39 L74 71 Z" fill="#fff" />
      {/* sorrisos vermelhos por cima */}
      <path d="M32 53 Q37 58.5 42 53" fill="none" stroke={SAPIEN_RED} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M58 53 Q63 58.5 68 53" fill="none" stroke={SAPIEN_RED} strokeWidth="3.4" strokeLinecap="round" />
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
