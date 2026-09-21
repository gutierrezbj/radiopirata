# RadioPirata: web y API en un solo proceso Node.
# Construir:  docker build -t radiopirata .
# Ejecutar:   docker run --rm -p 3001:3001 radiopirata

FROM node:22-alpine AS build
WORKDIR /app
# Primero solo los manifiestos, para que la instalación se reaproveche entre builds.
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
# Solo dependencias de ejecución: ni Vite, ni TypeScript, ni pruebas.
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/data server/data
COPY --from=build /app/web/dist web/dist

ENV PORT=3001 WEB_DIST=../web/dist
EXPOSE 3001
USER node
WORKDIR /app/server

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3001/api/salud || exit 1

# Sin intérprete de shell por delante: así Node recibe SIGTERM y cierra ordenadamente.
CMD ["node", "dist/index.js"]
