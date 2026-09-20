# RadioPirata

¿Dónde escuchamos hoy?

Una web para descubrir y escuchar emisoras del mundo mediante un globo interactivo.
La música siempre es buena compañía.

## Estado
Encargo y arquitectura preparados. Aplicación pendiente de implementar. No hay todavía comandos de arranque, pruebas ejecutadas ni despliegue.

## Fuente de trabajo
- Repositorio: https://github.com/gutierrezbj/radiopirata
- Carpeta del usuario: `C:\Users\Juan Gutierrez\OneDrive\02.SR docs\SRS\RadioPirata`
- Destino previsto: `radio.jrgblanco.com` (pendiente de configurar).
- Leer primero [AGENTS.md](AGENTS.md) y [el encargo](docs/ENCARGO.md).
- Progreso: [tasks/todo.md](tasks/todo.md).
- Sincronización local: [docs/SINCRONIZACION.md](docs/SINCRONIZACION.md).

## Primera meta
Abrir → elegir Tokio, Caracas o Lisboa → escuchar una emisora real → seguir explorando sin interrumpirla.

## Base técnica acordada
React, TypeScript y Vite; Globe.gl; API pequeña Node.js con caché para Radio Browser; audio directo desde la emisora. Favoritos y recientes locales en una entrega posterior.

Los mockups aprobados están en la conversación de diseño y aún no están incluidos en este repositorio. El encargo describe su composición. Sus nombres de emisora y marcadores son ilustrativos.

## Documentación técnica
- https://globe.gl/
- https://docs.radio-browser.info/
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
