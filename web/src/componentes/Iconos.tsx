interface Props {
  tamano?: number;
}

export function IconoRadio({ tamano = 28 }: Props) {
  return (
    <svg viewBox="0 0 32 32" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <rect x="4" y="11" width="24" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="21" cy="19" r="3.6" fill="none" stroke="var(--acento)" strokeWidth="1.8" />
      <path d="M8.5 16h6M8.5 20h6" stroke="var(--secundario)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 11l9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconoPlay({ tamano = 22 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <path d="M7 5v14l12-7z" fill="currentColor" />
    </svg>
  );
}

export function IconoPausa({ tamano = 22 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
    </svg>
  );
}

export function IconoAnterior({ tamano = 20 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <path d="M18 5v14L8 12z" fill="currentColor" />
      <path d="M6 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconoSiguiente({ tamano = 20 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <path d="M6 5v14l10-7z" fill="currentColor" />
      <path d="M18 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconoVolumen({ tamano = 20 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconoSilencio({ tamano = 20 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconoEstrella({ tamano = 20, llena = false }: Props & { llena?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <path
        d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
        fill={llena ? 'var(--acento)' : 'none'}
        stroke={llena ? 'var(--acento)' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconoCompartir({ tamano = 20 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <circle cx="18" cy="5.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="18.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Tres zetas: dormir. Antes era una luna, pero una luna en una interfaz se lee como
 * «modo nocturno» y aquí lo que se apaga es la radio, no las luces (JuanCho, 22 sep).
 */
export function IconoDormir({ tamano = 20 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.8 3.6h8.2l-8.2 8.2h8.2" />
        <path d="M3.4 12.8h6.8l-6.8 6.8h6.8" />
      </g>
    </svg>
  );
}

export function IconoLupa({ tamano = 18 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
