export function IconoRadio({ tamano = 28 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={tamano} height={tamano} aria-hidden="true" focusable="false">
      <rect x="4" y="11" width="24" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="21" cy="19" r="3.6" fill="none" stroke="var(--acento)" strokeWidth="1.8" />
      <path d="M8.5 16h6M8.5 20h6" stroke="var(--secundario)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 11l9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
