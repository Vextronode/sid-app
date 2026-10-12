#!/usr/bin/env bash
# Smoke test SID lewat Nginx (satu origin). Exit 0 = semua OK.
#   bash deploy/scripts/smoke.sh
# Variabel:
#   SID_SMOKE_URL      basis URL (default http://127.0.0.1:$SID_HTTP_PORT)
#   SID_SMOKE_TIMEOUT  batas waktu per request, detik (default 10)
#   SID_SMOKE_USER / SID_SMOKE_PASS  login akun warga demo (opsional; atau di smoke.env)
#   SID_SMOKE_ORIGIN   Origin untuk Sanctum (default APP_URL dari file env aktif)
set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

load_compose_env
# Dipanggil deploy.sh: SID_ENV_FILE sudah diekspor untuk mode yang sedang di-deploy.
if [ -z "${SID_ENV_FILE:-}" ]; then
  use_db_mode "$(current_db_mode)"
fi

BASE="${SID_SMOKE_URL:-http://127.0.0.1:${SID_HTTP_PORT}}"
BASE="${BASE%/}"
TO="${SID_SMOKE_TIMEOUT:-10}"
# Endpoint publik yang menyentuh DB (cache store database + query jenis surat).
PUBLIC_DB_ENDPOINT="/api/public/letter-types"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/sid-smoke.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# Server tanpa curl terpasang: jalankan curl dari container (jaringan host, Linux).
# Folder kerja di-mount di path yang sama dan ditulis dengan uid/gid pengguna ini.
SID_CURL_IMAGE="${SID_CURL_IMAGE:-curlimages/curl:8.22.0}"
if ! command -v curl >/dev/null 2>&1; then
  command -v docker >/dev/null 2>&1 || die "curl maupun docker tidak ditemukan."
  info "curl tidak terpasang di host; memakai container $SID_CURL_IMAGE."
  curl() {
    docker run --rm --network host --user "$(id -u):$(id -g)" \
      -v "$WORK:$WORK" --entrypoint curl "$SID_CURL_IMAGE" "$@"
  }
fi

fails=0
ok() { printf 'OK     %s\n' "$*"; }
bad() { printf 'GAGAL  %s\n' "$*"; fails=$((fails + 1)); }

# req <nama> <curl args...> : simpan header/body ke $WORK/<nama>.{h,b}; cetak kode status.
req() {
  local name="$1"
  shift
  curl -sS -m "$TO" -o "$WORK/$name.b" -D "$WORK/$name.h" -w '%{http_code}' "$@" 2>"$WORK/$name.err" || true
}

ctype() { grep -i '^content-type:' "$WORK/$1.h" | tail -n 1 | tr -d '\r' | cut -d: -f2- | tr -d ' '; }

info "smoke terhadap $BASE"

# 1. Nginx hidup
code="$(req healthz "$BASE/healthz")"
if [ "$code" = "200" ]; then ok "/healthz 200"; else bad "/healthz -> $code (harap 200)"; fi

# 2. Laravel hidup lewat FPM
code="$(req up "$BASE/up")"
if [ "$code" = "200" ]; then ok "/up 200"; else bad "/up -> $code (harap 200)"; fi

# 3. CSRF cookie
code="$(req csrf "$BASE/sanctum/csrf-cookie")"
if [ "$code" = "204" ] && grep -qi '^set-cookie: XSRF-TOKEN=' "$WORK/csrf.h"; then
  ok "/sanctum/csrf-cookie 204 + XSRF-TOKEN"
else
  bad "/sanctum/csrf-cookie -> $code (harap 204 + cookie XSRF-TOKEN)"
fi

# 4. Endpoint publik yang menyentuh DB
code="$(req pub -H 'Accept: application/json' "$BASE$PUBLIC_DB_ENDPOINT")"
if [ "$code" = "200" ] && ctype pub | grep -qi 'application/json'; then
  ok "$PUBLIC_DB_ENDPOINT 200 JSON"
else
  bad "$PUBLIC_DB_ENDPOINT -> $code $(ctype pub) (harap 200 JSON)"
fi

# 5. API terlindungi tanpa login
code="$(req user -H 'Accept: application/json' "$BASE/api/user")"
if [ "$code" = "401" ] && ctype user | grep -qi 'application/json'; then
  ok "/api/user tanpa login 401 JSON"
else
  bad "/api/user tanpa login -> $code $(ctype user) (harap 401 JSON)"
fi

# 6. SPA
code="$(req spa "$BASE/")"
if [ "$code" = "200" ] && grep -q 'id="root"' "$WORK/spa.b"; then
  ok "/ 200 HTML SPA (#root)"
else
  bad "/ -> $code (harap 200 HTML berisi id=\"root\")"
fi

# 7. Login demo (opsional).
# Cookie sesi ber-flag Secure tidak dikirim balik oleh cookie jar curl lewat HTTP biasa,
# jadi cookie ditangani eksplisit: Set-Cookie diurai, dikirim ulang lewat header Cookie,
# token XSRF di-URL-decode ke X-XSRF-TOKEN, dan X-Forwarded-Proto: https dikirim seperti proxy.
smoke_env="$SID_CONFIG_DIR/smoke.env"
user="${SID_SMOKE_USER:-}"
pass="${SID_SMOKE_PASS:-}"
if [ -z "$user" ] && [ -f "$smoke_env" ]; then
  user="$(env_get "$smoke_env" SID_SMOKE_USER)"
  pass="$(env_get "$smoke_env" SID_SMOKE_PASS)"
fi

# Gabungkan cookie dari file header ke $WORK/jar (name=value per baris, yang baru menimpa).
absorb_cookies() {
  local h="$1" pair name
  touch "$WORK/jar"
  while IFS= read -r pair; do
    name="${pair%%=*}"
    grep -v "^${name}=" "$WORK/jar" > "$WORK/jar.new" || true
    printf '%s\n' "$pair" >> "$WORK/jar.new"
    mv -f "$WORK/jar.new" "$WORK/jar"
  done < <(grep -i '^set-cookie:' "$h" | tr -d '\r' | sed -E 's/^[Ss][Ee][Tt]-[Cc][Oo][Oo][Kk][Ii][Ee]:[[:space:]]*//; s/;.*$//')
}

cookie_header() { paste -sd ';' "$WORK/jar" | sed 's/;/; /g'; }

xsrf_token() {
  local raw
  raw="$(grep '^XSRF-TOKEN=' "$WORK/jar" | tail -n 1 | cut -d= -f2-)"
  printf '%b' "$(printf '%s' "$raw" | sed 's/+/ /g; s/%\([0-9A-Fa-f][0-9A-Fa-f]\)/\\x\1/g')"
}

if [ -z "$user" ] || [ -z "$pass" ]; then
  warn "login demo dilewati (SID_SMOKE_USER/SID_SMOKE_PASS kosong; isi env atau $smoke_env)."
else
  origin="${SID_SMOKE_ORIGIN:-$(env_get "$SID_ENV_FILE" APP_URL)}"
  [ -n "$origin" ] || origin="$BASE"
  : > "$WORK/jar"
  common=(-H 'Accept: application/json' -H 'X-Requested-With: XMLHttpRequest'
          -H 'X-Forwarded-Proto: https' -H "Origin: $origin" -H "Referer: $origin/")

  req lcsrf "${common[@]}" "$BASE/sanctum/csrf-cookie" >/dev/null
  absorb_cookies "$WORK/lcsrf.h"

  json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
  printf '{"username":"%s","password":"%s"}' "$(json_escape "$user")" "$(json_escape "$pass")" > "$WORK/login.json"
  code="$(req login "${common[@]}" -H 'Content-Type: application/json' \
    -H "X-XSRF-TOKEN: $(xsrf_token)" -H "Cookie: $(cookie_header)" \
    --data-binary "@$WORK/login.json" "$BASE/login")"
  rm -f "$WORK/login.json"
  absorb_cookies "$WORK/login.h"
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then
    ok "login demo ($user) $code"
    code="$(req me "${common[@]}" -H "Cookie: $(cookie_header)" "$BASE/api/user")"
    if [ "$code" = "200" ]; then ok "/api/user setelah login 200"; else bad "/api/user setelah login -> $code (harap 200)"; fi
    absorb_cookies "$WORK/me.h"
    code="$(req logout "${common[@]}" -H "X-XSRF-TOKEN: $(xsrf_token)" -H "Cookie: $(cookie_header)" \
      -X POST "$BASE/logout")"
    if { [ "$code" = "204" ] || [ "$code" = "200" ]; }; then ok "logout $code"; else bad "logout -> $code (harap 204)"; fi
  else
    bad "login demo ($user) -> $code (harap 200/204; 419 = CSRF/cookie, 422 = kredensial/throttle)"
  fi
fi

if [ "$fails" -gt 0 ]; then
  printf 'SMOKE GAGAL: %d pemeriksaan gagal.\n' "$fails"
  log_line "smoke GAGAL ($fails) $BASE"
  exit 1
fi
printf 'SMOKE OK\n'
log_line "smoke OK $BASE"
