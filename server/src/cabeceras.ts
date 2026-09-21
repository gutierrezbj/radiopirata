import type { NextFunction, Request, Response } from 'express';

/**
 * Política de contenidos de RadioPirata.
 *
 * `media-src https:` es deliberado: el audio llega directo desde el servidor de cada emisora,
 * que puede ser cualquier dominio, y ese es el único origen externo que la aplicación necesita.
 *
 * `style-src` admite estilos en línea porque la librería del globo coloca sus etiquetas
 * escribiendo `style` en los elementos; sin esto, la información al pasar el ratón no se sitúa.
 * Es un permiso de estilos, no de código: `script-src` sigue admitiendo solo este servidor,
 * que es lo que evita la ejecución de código ajeno.
 */
export const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  'media-src https:',
  "form-action 'self'",
].join('; ');

export interface OpcionesCabeceras {
  /** Añade HSTS. Solo tiene sentido si el sitio ya se sirve por HTTPS. */
  hsts?: boolean;
}

export function cabecerasSeguras({ hsts = false }: OpcionesCabeceras = {}) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (hsts) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}
