# Sincronizar la carpeta de Windows

Carpeta del usuario: `C:\Users\Juan Gutierrez\OneDrive\02.SR docs\SRS\RadioPirata`.
Repositorio: https://github.com/gutierrezbj/radiopirata

El agente remoto no tiene acceso a esa carpeta. Estas instrucciones las ejecuta el agente local.

1. Inspeccionar el contenido, incluido cualquier repositorio Git y cambios sin commit.
2. Si la carpeta está vacía y no tiene Git, clonar el repositorio en ella.
3. Si ya es un clon de este repositorio, inspeccionar git status, remotos y rama, hacer fetch y actualizar mediante fast-forward cuando sea posible.
4. Si tiene archivos pero no Git, clonar en una carpeta hermana temporal y conciliar los archivos antes de establecer la carpeta de trabajo. No clonar encima ni borrar contenido.
5. Si tiene Git con historial distinto, preservar ambas historias y revisar diferencias. No usar reset --hard, clean, force-push ni un merge de historias no relacionadas como atajo.
6. No reemplazar un remoto existente sin comprobar su destino.
7. Leer AGENTS.md, docs/ENCARGO.md y tasks/todo.md antes de empezar E1.

El repositorio ya contiene documentación inicial; no partir de un init vacío ignorándola.
