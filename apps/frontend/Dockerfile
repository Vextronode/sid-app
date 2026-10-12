# syntax=docker/dockerfile:1
# Image sid-web: build SPA (Vite) lalu sajikan dengan Nginx + proxy ke sid_api.
# Konteks build = ROOT repo:
#   docker build -f apps/frontend/Dockerfile -t sid-web:<tag> .
# Apps/frontend/Dockerfile.dockerignore membatasi konteks ke apps/frontend + deploy/nginx/sid.conf.

# Hasil build (dist) tidak bergantung arsitektur: stage ini selalu berjalan di platform
# builder (tanpa QEMU) walau image akhir multi-arch.
FROM --platform=$BUILDPLATFORM node:22.23.3-trixie-slim AS build

WORKDIR /src/apps/frontend

# Dependency dulu (cache lapisan). --ignore-scripts: script `prepare` (husky/git)
# dan postinstall tidak dibutuhkan untuk build.
COPY apps/frontend/package.json apps/frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY apps/frontend/ ./

# Same-origin: VITE_API_URL sengaja TIDAK di-set (fallback window.location.origin).
# Berjaga-jaga bila berkas env lokal lolos ke konteks.
RUN set -eux; \
    rm -f .env .env.local .env.production .env.production.local; \
    unset VITE_API_URL VITE_API_BASE_URL; \
    npm run build; \
    test -f dist/index.html

FROM nginx:1.30.5-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx/sid.conf /etc/nginx/conf.d/sid.conf
COPY --from=build /src/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
