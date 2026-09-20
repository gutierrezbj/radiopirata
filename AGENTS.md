# Instrucciones para el agente — RadioPirata

## Objetivo
Implementar el producto descrito en docs/ENCARGO.md, empezando por E1. Trabajar de forma autónoma en cambios locales reversibles. Respetar instrucciones explícitas del usuario por encima de este documento.

## Antes de editar
1. Leer este archivo, docs/ENCARGO.md y tasks/todo.md.
2. Inspeccionar archivos, estado Git, ramas y remotos. Preservar trabajo previo y cambios sin commit.
3. Sincronizar conforme a docs/SINCRONIZACION.md. Nunca forzar un push, descartar archivos ni reemplazar un remoto existente a ciegas.
4. Si ya existe implementación, compararla con el encargo antes de reconstruir nada.

## Implementación
- Repositorio independiente. No importar identidad ni componentes de otros proyectos por defecto.
- Código TypeScript claro y estructura pequeña. Sin microservicios, cuentas, base de datos o funciones de IA en esta primera fase.
- Un único controlador y elemento de audio persistente para toda la aplicación.
- Consultas al catálogo mediante API propia. Audio directo; no crear proxy de audio ni un proxy genérico de URLs.
- Datos reales en la app; fixtures identificados solo para pruebas. Nunca inventar señales, coordenadas o comprobaciones.
- Separar navegación del globo de reproducción: mover el mapa no debe cortar la emisora.
- Estados de carga, vacío y error comprensibles. Cancelar búsquedas obsoletas y evitar resultados fuera de orden.
- No bloquear el acceso al listado y al reproductor si WebGL no está disponible.
- No publicar, cambiar DNS ni contratar servicios hasta que el usuario lo indique.

## Validación y entrega
- Comprobar el recorrido real de escucha y los cambios rápidos de emisora.
- Verificar diseño de escritorio y móvil, teclado y reducción de movimiento.
- Ejecutar build y comprobación de tipos; añadir pruebas útiles para concurrencia de audio y tratamiento de errores.
- Distinguir señal accesible por HTTP de reproducción audible en navegador. Si falta acceso a un dispositivo, declarar la limitación.
- Mantener tasks/todo.md y README.md con estado, comandos reales, resultados y pendientes.
- Subir commits coherentes al repositorio autorizado, sin secretos, node_modules ni builds.
- Informar del commit entregado. No afirmar que está publicado o probado si no lo está.
