#!/usr/bin/env bash
# Mengembalikan DB demo lokal ke golden dump.
#   bash deploy/scripts/reset-demo.sh [--yes] [--check] [--dump <file>]
#
#   --check   hanya memeriksa guard (tidak mengubah apa pun); exit 0 = reset diizinkan
#   --yes     tanpa konfirmasi (guard tetap berlaku penuh)
#   --dump F  dump lain di backups/ (default: isi backups/golden-current)
#
# Efek: semua sesi keluar dan lockout login terbuka (tabel sessions/cache kosong).
# Tidak pernah menyentuh Neon: hanya berjalan pada mode local dengan DB_HOST=sid_db.
set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

CHECK_ONLY=0
DUMP_ARG=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes) SID_ASSUME_YES=1 ;;
    --check) CHECK_ONLY=1 ;;
    --dump)
      [ "$#" -ge 2 ] || { echo "Pemakaian: $0 [--yes] [--check] [--dump <file>]" >&2; exit 2; }
      DUMP_ARG="$2"
      shift
      ;;
    -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opsi tidak dikenal: $1" >&2; exit 2 ;;
  esac
  shift
done
export SID_ASSUME_YES="${SID_ASSUME_YES:-0}"

# ---------- Guard (semua wajib lulus; tidak ada flag untuk melewatinya) ----------
GUARD_FAIL=0
gfail() { printf '[sid] GUARD DITOLAK: %s\n' "$*" >&2; GUARD_FAIL=1; }
gok() { printf '[sid] guard ok: %s\n' "$*"; }

load_compose_env
MODE="$(current_db_mode)"
# Selalu sid.env (mode local), apa pun isi state; sid.neon.env tidak pernah dibaca.
use_db_mode local
ENV_FILE="$SID_CONFIG_DIR/sid.env"

if [ "$MODE" = "local" ]; then gok "mode DB local"; else gfail "mode DB = '$MODE' (reset hanya untuk local)."; fi

if [ -f "$ENV_FILE" ]; then
  if ensure_private_file "$ENV_FILE"; then gok "izin sid.env 600 (atau Windows)"; else gfail "izin $ENV_FILE bukan 600."; fi
  ROLE="$(env_get "$ENV_FILE" SID_ROLE)"
  DB_HOST_V="$(env_get "$ENV_FILE" DB_HOST)"
  DB_NAME="$(env_get "$ENV_FILE" DB_DATABASE)"
  DB_USER="$(env_get "$ENV_FILE" DB_USERNAME)"
else
  gfail "tidak ada $ENV_FILE."
  ROLE="" DB_HOST_V="" DB_NAME="" DB_USER=""
fi

if [ "$ROLE" = "expo" ]; then gok "SID_ROLE=expo"; else gfail "SID_ROLE='$ROLE' (harus expo)."; fi
if [ "$DB_HOST_V" = "sid_db" ]; then gok "DB_HOST=sid_db"; else gfail "DB_HOST='$DB_HOST_V' (harus persis sid_db, service DB lokal)."; fi
if [[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] && [ "$DB_NAME" != "postgres" ] && [ "$DB_NAME" != "template0" ] && [ "$DB_NAME" != "template1" ]; then
  gok "DB_DATABASE=$DB_NAME"
else
  gfail "DB_DATABASE='$DB_NAME' tidak valid/terlarang."
fi
if [[ "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]]; then gok "DB_USERNAME valid"; else gfail "DB_USERNAME tidak valid."; fi

# Dump + checksum.
if [ -n "$DUMP_ARG" ]; then
  DUMP="$DUMP_ARG"
else
  cur=""
  if [ -f "$SID_BACKUP_DIR/golden-current" ]; then
    cur="$(tr -d '[:space:]' < "$SID_BACKUP_DIR/golden-current")"
  fi
  DUMP="${cur:+$SID_BACKUP_DIR/$cur}"
fi
if [ -n "$DUMP" ] && [ -f "$DUMP" ] && [ -s "$DUMP" ]; then
  if [ -f "$DUMP.sha256" ]; then
    want="$(awk '{print $1}' "$DUMP.sha256")"
    have="$(sha256_of "$DUMP")"
    if [ -n "$want" ] && [ "$want" = "$have" ]; then
      gok "checksum dump cocok ($(basename "$DUMP"))"
    else
      gfail "checksum $(basename "$DUMP") TIDAK cocok dengan .sha256 (dump rusak?)."
    fi
  else
    gfail "tidak ada $DUMP.sha256."
  fi
else
  gfail "dump golden tidak ditemukan (${DUMP:-backups/golden-current kosong}). Jalankan make-golden.sh."
fi

# Docker dan container DB milik proyek ini.
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  st="$(container_state "$SID_C_DB")"
  if [ "$st" = "healthy" ]; then gok "$SID_C_DB sehat"; else gfail "$SID_C_DB tidak sehat/tidak berjalan (status: $st)."; fi
  proj="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$SID_C_DB" 2>/dev/null || true)"
  if [ "$proj" = "$SID_PROJECT" ]; then
    gok "$SID_C_DB milik proyek $SID_PROJECT"
  else
    gfail "$SID_C_DB bukan milik proyek compose '$SID_PROJECT' (label: '$proj')."
  fi
  tag="$(state_get current_tag)"
  if [ -n "$tag" ]; then gok "tag berjalan $tag"; else gfail "tag berjalan tidak diketahui (.state/current_tag kosong)."; fi
else
  gfail "Docker tidak tersedia."
fi

if [ "$GUARD_FAIL" -ne 0 ]; then
  log_line "reset DITOLAK guard"
  echo "[sid] RESET TIDAK DIIZINKAN." >&2
  exit 1
fi
if [ "$CHECK_ONLY" -eq 1 ]; then
  echo "[sid] --check: semua guard lulus; reset diizinkan."
  exit 0
fi

# ---------- Reset ----------
use_tag "$tag"
confirm "Reset DB '$DB_NAME' ke $(basename "$DUMP")? Semua data demo saat ini HILANG dan semua sesi keluar." RESET \
  || die "reset dibatalkan pengguna."

acquire_lock
trap release_lock EXIT

psql_admin() {
  docker exec -i "$SID_C_DB" psql -v ON_ERROR_STOP=1 -X -q -U "$DB_USER" -d postgres "$@"
}

log_line "reset mulai db=$DB_NAME dump=$(basename "$DUMP") tag=$tag"
info "1/5 hentikan sid_api & sid_scheduler..."
# Scheduler ikut dihentikan agar tidak menyentuh DB selama di-drop/restore.
dc stop sid_api sid_scheduler

info "2/5 DROP DATABASE $DB_NAME WITH (FORCE)..."
psql_admin -c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE);"

info "3/5 CREATE DATABASE $DB_NAME OWNER $DB_USER..."
psql_admin -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"

info "4/5 pg_restore (dump dialirkan lewat stdin)..."
docker exec -i "$SID_C_DB" pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl --exit-on-error < "$DUMP" \
  || die "pg_restore gagal. DB $DB_NAME mungkin kosong/sebagian; ulangi reset-demo.sh. sid_api masih berhenti."

info "5/5 nyalakan sid_api & sid_scheduler..."
dc start sid_api sid_scheduler || dc up -d --no-deps sid_api sid_scheduler
wait_healthy "$SID_C_API" 180 || die "sid_api tidak sehat setelah reset."
wait_healthy "$SID_C_WEB" 60 || die "sid_web tidak sehat setelah reset."

bash "$SID_SCRIPTS_DIR/smoke.sh" || die "smoke gagal setelah reset."
log_line "reset OK db=$DB_NAME dump=$(basename "$DUMP")"
info "RESET OK: data demo kembali ke $(basename "$DUMP"); semua sesi keluar, lockout login terbuka."
