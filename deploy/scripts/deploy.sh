#!/usr/bin/env bash
# Deploy SID berdasarkan tag image (dibangun CI, di-pull dari registry).
#   bash deploy/scripts/deploy.sh <tag> [--build] [--migrate] [--yes] [--no-pull] [--db local|neon]
#
#   --build     bangun image di mesin ini dari source repo (tanpa GHCR/CI); Node/PHP hanya di Docker
#   --migrate   jalankan migrasi (daftar pending + konfirmasi) dengan image baru sebelum up
#               (deploy pertama mode local: migrasi otomatis tanpa konfirmasi)
#   --yes       tanpa konfirmasi interaktif
#   --no-pull   pakai image yang sudah ada di mesin (uji/offline); tetap dicek keberadaannya
#   --db MODE   local (default / mode terakhir) atau neon (fallback)
#
# Gagal setelah stack disentuh -> rollback otomatis ke tag sebelumnya, smoke ulang, exit non-nol.
# Tidak pernah menjalankan `down -v`.
set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

TAG=""
DO_MIGRATE=0
DO_PULL=1
DO_BUILD=0
FIRST_DEPLOY=0
DB_MODE_ARG=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --migrate) DO_MIGRATE=1 ;;
    --yes) SID_ASSUME_YES=1 ;;
    --no-pull) DO_PULL=0 ;;
    --build) DO_BUILD=1; DO_PULL=0 ;;
    --db)
      [ "$#" -ge 2 ] || usage
      DB_MODE_ARG="$2"
      shift
      ;;
    --db=*) DB_MODE_ARG="${1#--db=}" ;;
    -h|--help) usage ;;
    -*) echo "Opsi tidak dikenal: $1" >&2; usage ;;
    *)
      [ -z "$TAG" ] || usage
      TAG="$1"
      ;;
  esac
  shift
done
[ -n "$TAG" ] || usage
export SID_ASSUME_YES="${SID_ASSUME_YES:-0}"

# ---------- Preflight ----------
valid_tag "$TAG" || die "tag tidak valid: '$TAG' (harus cocok ^v[0-9]+.[0-9]+.[0-9]+(-label)?; bukan latest)."
require_docker
mkdir -p "$SID_STATE_DIR"
load_compose_env

PREV_TAG="$(state_get current_tag)"
PREV_MODE="$(current_db_mode)"
MODE="${DB_MODE_ARG:-$PREV_MODE}"
use_db_mode "$MODE"
use_tag "$TAG"

# Deploy pertama di DB lokal: DB kosong, migrasi wajib dan aman dijalankan otomatis.
if [ -z "$PREV_TAG" ] && [ "$MODE" = "local" ]; then
  FIRST_DEPLOY=1
  if [ "$DO_MIGRATE" -eq 0 ]; then
    info "deploy pertama (belum ada .state/current_tag): migrasi dijalankan otomatis."
    DO_MIGRATE=1
  fi
fi

require_private_file "$SID_CONFIG_DIR/compose.env"
require_private_file "$SID_ENV_FILE"
[ ! -f "$SID_CONFIG_DIR/smoke.env" ] || require_private_file "$SID_CONFIG_DIR/smoke.env"
check_placeholders "$SID_CONFIG_DIR/compose.env"
check_placeholders "$SID_ENV_FILE"
[ -n "$SID_REGISTRY" ] || die "SID_REGISTRY kosong di compose.env."
[ -n "$(env_get "$SID_ENV_FILE" APP_KEY)" ] || die "APP_KEY kosong di $SID_ENV_FILE."

if [ "$MODE" = "local" ]; then
  [ "$(env_get "$SID_ENV_FILE" DB_HOST)" = "sid_db" ] || die "mode local: DB_HOST harus sid_db."
  for pair in POSTGRES_DB:DB_DATABASE POSTGRES_USER:DB_USERNAME POSTGRES_PASSWORD:DB_PASSWORD; do
    a="${pair%%:*}"
    b="${pair##*:}"
    [ -n "$(env_get "$SID_ENV_FILE" "$a")" ] || die "mode local: $a kosong di $SID_ENV_FILE."
    [ "$(env_get "$SID_ENV_FILE" "$a")" = "$(env_get "$SID_ENV_FILE" "$b")" ] \
      || die "mode local: $a tidak sama dengan $b di $SID_ENV_FILE."
  done
else
  [ "$(env_get "$SID_ENV_FILE" DB_SSLMODE)" = "require" ] || warn "mode neon: DB_SSLMODE sebaiknya require."
  if [ "$DO_MIGRATE" -eq 1 ] && [ -z "$(env_get "$SID_ENV_FILE" DB_HOST_DIRECT)" ]; then
    die "mode neon + --migrate: DB_HOST_DIRECT (host direct, bukan pooler) wajib diisi."
  fi
fi

dc config --quiet || die "docker compose config tidak valid."

acquire_lock
trap release_lock EXIT

info "deploy $TAG (mode DB: $MODE, proyek: $SID_PROJECT, sebelumnya: ${PREV_TAG:-tidak ada})"
log_line "deploy mulai tag=$TAG mode=$MODE prev=${PREV_TAG:-none}"

# ---------- Build lokal (opsional; gagal = berhenti sebelum menyentuh stack) ----------
if [ "$DO_BUILD" -eq 1 ]; then
  [ -f "$SID_REPO_DIR/apps/backend/Dockerfile" ] && [ -f "$SID_REPO_DIR/apps/frontend/Dockerfile" ] \
    || die "--build butuh repo lengkap (apps/backend, apps/frontend) di $SID_REPO_DIR, bukan hanya folder deploy/."
  info "build sid-api:$TAG (composer di dalam Docker; beberapa menit, butuh internet)..."
  DOCKER_BUILDKIT=1 docker build -t "$SID_REGISTRY/sid-api:$TAG" "$SID_REPO_DIR/apps/backend" \
    || die "build sid-api gagal; stack yang berjalan TIDAK disentuh."
  info "build sid-web:$TAG (npm + vite di dalam Docker)..."
  DOCKER_BUILDKIT=1 docker build -f "$SID_REPO_DIR/apps/frontend/Dockerfile" -t "$SID_REGISTRY/sid-web:$TAG" "$SID_REPO_DIR" \
    || die "build sid-web gagal; stack yang berjalan TIDAK disentuh."
  log_line "build lokal OK tag=$TAG"
fi

# ---------- Pull (gagal = berhenti sebelum menyentuh stack berjalan) ----------
if [ "$DO_PULL" -eq 1 ]; then
  info "pull image..."
  dc pull || die "pull gagal; stack yang berjalan TIDAK disentuh. Cek login GHCR (classic PAT read:packages) dan nama tag."
else
  for img in "$SID_REGISTRY/sid-api:$TAG" "$SID_REGISTRY/sid-web:$TAG"; do
    docker image inspect "$img" >/dev/null 2>&1 || die "--no-pull: image $img tidak ada di mesin ini."
  done
  info "memakai image lokal (tanpa pull)."
fi

# ---------- Migrasi (opsional) ----------
if [ "$DO_MIGRATE" -eq 1 ]; then
  warn "Selama freeze, migrasi HANYA boleh aditif (tambah tabel/kolom nullable). Tidak ada rollback skema otomatis."
  run_env=()
  if [ "$MODE" = "local" ]; then
    dc up -d sid_db
    wait_healthy "$SID_C_DB" 120 || die "sid_db tidak sehat; migrasi dibatalkan, stack aplikasi tidak disentuh."
  else
    run_env=(-e "DB_HOST=$(env_get "$SID_ENV_FILE" DB_HOST_DIRECT)")
  fi
  info "migrasi pending (image $TAG):"
  dc run --rm --no-deps -T ${run_env[@]+"${run_env[@]}"} sid_api php artisan migrate:status --pending \
    || die "migrate:status gagal; stack aplikasi tidak disentuh."
  [ "$FIRST_DEPLOY" -eq 1 ] || confirm "Jalankan migrate --force dengan image $TAG?" ya || die "migrasi dibatalkan pengguna; stack tidak disentuh."
  dc run --rm --no-deps -T ${run_env[@]+"${run_env[@]}"} sid_api php artisan migrate --force \
    || die "migrasi gagal; stack aplikasi tidak diganti (periksa log di atas)."
  log_line "migrasi OK tag=$TAG mode=$MODE"
fi

# ---------- Up ----------
start_stack() {
  dc up -d --remove-orphans || return 1
  if [ "$SID_DB_MODE" = "local" ]; then
    wait_healthy "$SID_C_DB" 120 || return 1
  fi
  wait_healthy "$SID_C_API" 180 || return 1
  wait_healthy "$SID_C_WEB" 60 || return 1
}

smoke() {
  bash "$SID_SCRIPTS_DIR/smoke.sh"
}

if start_stack && smoke; then
  if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$TAG" ]; then
    state_set previous_tag "$PREV_TAG"
  fi
  state_set current_tag "$TAG"
  state_set db_mode "$MODE"
  log_line "deploy OK tag=$TAG mode=$MODE"
  info "DEPLOY OK: $TAG (mode $MODE). Rollback manual: bash deploy/scripts/deploy.sh ${PREV_TAG:-<tag-sebelumnya>}"
  exit 0
fi

# ---------- Rollback otomatis ----------
warn "deploy $TAG GAGAL."
log_line "deploy GAGAL tag=$TAG mode=$MODE"
ROLLBACK_TAG="$PREV_TAG"
if [ -z "$ROLLBACK_TAG" ] || [ "$ROLLBACK_TAG" = "$TAG" ]; then
  ROLLBACK_TAG="$(state_get previous_tag)"
fi
if [ -z "$ROLLBACK_TAG" ] || [ "$ROLLBACK_TAG" = "$TAG" ]; then
  die "tidak ada tag sebelumnya untuk rollback. Stack dibiarkan pada $TAG; periksa: bash deploy/scripts/lib.sh logs --tail 100"
fi

warn "rollback otomatis ke $ROLLBACK_TAG (mode $PREV_MODE)..."
use_db_mode "$PREV_MODE"
use_tag "$ROLLBACK_TAG"
if start_stack && smoke; then
  state_set current_tag "$ROLLBACK_TAG"
  state_set db_mode "$PREV_MODE"
  log_line "rollback OK ke tag=$ROLLBACK_TAG mode=$PREV_MODE (deploy $TAG gagal)"
  printf '[sid] GAGAL: deploy %s gagal; ROLLBACK ke %s berhasil dan stack sehat.\n' "$TAG" "$ROLLBACK_TAG" >&2
  exit 1
fi
log_line "rollback GAGAL ke tag=$ROLLBACK_TAG"
printf '[sid] GAGAL: deploy %s gagal DAN rollback ke %s gagal. Tindakan manual diperlukan (lihat runbook).\n' "$TAG" "$ROLLBACK_TAG" >&2
exit 2
