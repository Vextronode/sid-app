#!/bin/sh
# Entrypoint image sid-api.
# - Untuk `php-fpm` dan `php artisan ...`: validasi env, siapkan storage, cache config/view.
# - Perintah lain (mis. `php -m`, `composer ...`) langsung dijalankan.
# Tidak pernah menjalankan migrate, db:seed, key:generate, route:cache, atau optimize.
set -eu

APP_DIR=/var/www/html
cd "$APP_DIR"

needs_bootstrap=0
case "${1:-}" in
  php-fpm*) needs_bootstrap=1 ;;
  php) [ "${2:-}" = "artisan" ] && needs_bootstrap=1 ;;
esac

if [ "$needs_bootstrap" -eq 0 ]; then
  exec "$@"
fi

fail() {
  echo "[entrypoint] GAGAL: $*" >&2
  exit 1
}

# 1. Validasi env wajib (gagal cepat).
[ -n "${APP_KEY:-}" ] || fail "APP_KEY kosong. Isi APP_KEY (base64:...) di file env; jangan dibuat ulang setelah dipakai."
if [ "${DB_CONNECTION:-pgsql}" = "pgsql" ]; then
  for v in DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD; do
    eval "val=\${$v:-}"
    [ -n "$val" ] || fail "$v kosong. Periksa file env (sid.env / sid.neon.env)."
  done
fi

# 2. Direktori storage (volume baru bisa kosong).
for d in \
  storage/app/public \
  storage/app/private \
  storage/framework/cache/data \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  storage/fonts \
  bootstrap/cache; do
  mkdir -p "$d"
done

# 3. Kepemilikan: chown hanya bila pemilik direktori teratas berbeda
#    (hindari chown -R penuh tiap start pada volume besar).
for d in storage storage/app/public storage/app/private bootstrap/cache; do
  if [ "$(stat -c %U "$d")" != "www-data" ]; then
    echo "[entrypoint] chown www-data: $d"
    chown -R www-data:www-data "$d"
  fi
done

# 4. Artisan sebagai www-data (file cache harus bisa ditulis ulang oleh FPM).
as_www() {
  runuser -u www-data -- "$@"
}

as_www php artisan config:cache || fail "config:cache gagal (periksa nilai env)."
as_www php artisan view:cache || fail "view:cache gagal."
as_www php artisan storage:link >/dev/null 2>&1 || echo "[entrypoint] PERINGATAN: storage:link gagal (tidak fatal)." >&2

# 5. Jalankan perintah (CMD default: php-fpm). Proses artisan yang
#    berjalan terus (service sid_scheduler) dijalankan sebagai www-data
#    agar log/cache yang ditulisnya tetap bisa ditulis ulang oleh FPM.
if [ "${1:-}" = "php" ] && [ "${2:-}" = "artisan" ]; then
  case "${3:-}" in
    schedule:work|queue:work) exec runuser -u www-data -- "$@" ;;
  esac
fi

exec "$@"
