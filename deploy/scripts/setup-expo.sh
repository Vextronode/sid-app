#!/usr/bin/env bash
# Setup SID expo dengan SATU perintah di PC yang sudah ada Docker
# (PHP, Composer, Node.js, Nginx, PostgreSQL semuanya di dalam container; tidak dipasang di host).
#   bash deploy/scripts/setup-expo.sh [--pull] [<tag>]
#
#   <tag>    default: SID_IMAGE_TAG di compose.env
#   --pull   ambil image dari GHCR (butuh docker login) alih-alih build lokal dari source
#
# Pertama kali : build image -> migrasi -> golden DB dari seed -> isi DB demo dari golden -> smoke.
# Sudah pernah : hanya memastikan stack berjalan + smoke (data TIDAK diubah).
# Update versi : bash deploy/scripts/deploy.sh <tag> --build
set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

USE_PULL=0
TAG_ARG=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --pull) USE_PULL=1 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
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
  use_db_mode "$(current_db_mode)"
  use_tag "$CUR"
  dc up -d
  if [ "$SID_DB_MODE" = "local" ]; then
    wait_healthy "$SID_C_DB" 120 || die "$SID_C_DB tidak sehat."
  fi
  wait_healthy "$SID_C_API" 180 || die "$SID_C_API tidak sehat."
  wait_healthy "$SID_C_WEB" 60 || die "$SID_C_WEB tidak sehat."
  bash "$SID_SCRIPTS_DIR/smoke.sh"
  info "OK. Versi baru: bash deploy/scripts/deploy.sh <tag> --build"
  exit 0
fi

TAG="${TAG_ARG:-$(env_get "$SID_CONFIG_DIR/compose.env" SID_IMAGE_TAG)}"
valid_tag "$TAG" || die "tag tidak valid: '$TAG' (isi SID_IMAGE_TAG di compose.env atau beri argumen)."

info "SETUP PERTAMA SID expo, tag $TAG"
if [ "$USE_PULL" -eq 1 ]; then
  info "1/3 deploy (pull dari $SID_REGISTRY) + migrasi..."
  bash "$SID_SCRIPTS_DIR/deploy.sh" "$TAG" --yes
else
  info "1/3 build image lokal + deploy + migrasi (pertama kali bisa 5-15 menit)..."
  bash "$SID_SCRIPTS_DIR/deploy.sh" "$TAG" --build --yes
fi

info "2/3 golden DB dari seed demo..."
bash "$SID_SCRIPTS_DIR/make-golden.sh"

info "3/3 isi DB demo dari golden..."
bash "$SID_SCRIPTS_DIR/reset-demo.sh" --yes

APP_URL_V="$(env_get "$SID_CONFIG_DIR/sid.env" APP_URL)"
info "SETUP SELESAI."
info "  Lokal di PC ini : http://localhost:${SID_HTTP_PORT}"
info "  Publik          : ${APP_URL_V:-<APP_URL>} (lewat proxy/tunnel ke 127.0.0.1:${SID_HTTP_PORT})"
warn "Salin isi deploy/backups/ (golden dump) dan deploy/*.env ke luar PC ini."
