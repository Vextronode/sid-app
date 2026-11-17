#!/usr/bin/env bash
# Setup pertama SID dengan SATU perintah di server yang sudah ada Docker
# (PHP, Composer, Node.js, Nginx, PostgreSQL semuanya di dalam container; tidak dipasang di host).
#   bash deploy/scripts/setup.sh [--demo] [--pull] [<tag>]
#
#   <tag>    default: SID_IMAGE_TAG di compose.env
#   --demo   isi DB dengan data demo (desa/warga fiktif + akun demo_*); butuh SID_ROLE=demo di sid.env
#   --pull   ambil image dari registry (butuh docker login) alih-alih build lokal dari source
#
# Pertama kali : build image -> migrasi -> smoke. Dengan --demo: + golden DB dari seed -> isi DB demo.
# Sudah pernah : hanya memastikan stack berjalan + smoke (data TIDAK diubah).
# Update versi : bash deploy/scripts/deploy.sh <tag> --build --migrate
set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

USE_PULL=0
USE_DEMO=0
TAG_ARG=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --pull) USE_PULL=1 ;;
    --demo) USE_DEMO=1 ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Opsi tidak dikenal: $1" >&2; exit 2 ;;
    *) TAG_ARG="$1" ;;
  esac
  shift
done

require_docker
load_compose_env

CUR="$(state_get current_tag)"
if [ -n "$CUR" ]; then
  info "sudah pernah di-setup (tag berjalan: $CUR). Memastikan stack berjalan; data tidak diubah."
  [ "$USE_DEMO" -eq 0 ] || warn "--demo diabaikan. Untuk mengembalikan data demo: bash deploy/scripts/reset-demo.sh"
  use_db_mode "$(current_db_mode)"
  use_tag "$CUR"
  dc up -d
  if [ "$SID_DB_MODE" = "local" ]; then
    wait_healthy "$SID_C_DB" 120 || die "$SID_C_DB tidak sehat."
  fi
  wait_healthy "$SID_C_API" 180 || die "$SID_C_API tidak sehat."
  wait_healthy "$SID_C_WEB" 60 || die "$SID_C_WEB tidak sehat."
  bash "$SID_SCRIPTS_DIR/smoke.sh"
  info "OK. Versi baru: bash deploy/scripts/deploy.sh <tag> --build --migrate"
  exit 0
fi

TAG="${TAG_ARG:-$(env_get "$SID_CONFIG_DIR/compose.env" SID_IMAGE_TAG)}"
valid_tag "$TAG" || die "tag tidak valid: '$TAG' (isi SID_IMAGE_TAG di compose.env atau beri argumen)."

# Cek syarat demo sebelum build, supaya tidak gagal setelah 5-15 menit.
if [ "$USE_DEMO" -eq 1 ]; then
  [ "$(current_db_mode)" = "local" ] || die "--demo hanya untuk mode DB local."
  ROLE="$(env_get "$SID_CONFIG_DIR/sid.env" SID_ROLE)"
  [ "$ROLE" = "demo" ] || die "--demo butuh SID_ROLE=demo di sid.env (sekarang: '${ROLE}')."
  STEPS=3
else
  STEPS=1
fi

info "SETUP PERTAMA SID, tag $TAG$([ "$USE_DEMO" -eq 1 ] && echo ' (dengan data demo)')"
if [ "$USE_PULL" -eq 1 ]; then
  info "1/$STEPS deploy (pull dari $SID_REGISTRY) + migrasi..."
  bash "$SID_SCRIPTS_DIR/deploy.sh" "$TAG" --yes
else
  info "1/$STEPS build image lokal + deploy + migrasi (pertama kali bisa 5-15 menit)..."
  bash "$SID_SCRIPTS_DIR/deploy.sh" "$TAG" --build --yes
fi

if [ "$USE_DEMO" -eq 1 ]; then
  info "2/$STEPS golden DB dari seed demo..."
  bash "$SID_SCRIPTS_DIR/make-golden.sh"

  info "3/$STEPS isi DB demo dari golden..."
  bash "$SID_SCRIPTS_DIR/reset-demo.sh" --yes
fi

APP_URL_V="$(env_get "$SID_CONFIG_DIR/sid.env" APP_URL)"
info "SETUP SELESAI."
info "  Lokal di server : http://localhost:${SID_HTTP_PORT}"
info "  Publik          : ${APP_URL_V:-<APP_URL>} (lewat reverse proxy ke 127.0.0.1:${SID_HTTP_PORT})"
if [ "$USE_DEMO" -eq 1 ]; then
  info "  Login demo      : demo_admin (kata sandi di docs/SETUP.md)"
  warn "Salin isi deploy/backups/ (golden dump) dan deploy/*.env ke tempat aman di luar server."
else
  info "  DB masih kosong. Buat Staf SIDUTama pertama (lihat docs/SETUP.md):"
  info "    bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan staf-sid:first --help"
  warn "Simpan salinan deploy/*.env di tempat aman di luar server."
fi
