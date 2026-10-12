#!/usr/bin/env bash
# Membuat "golden DB" dari seed segar untuk reset demo.
#   bash deploy/scripts/make-golden.sh [--tag <tag>]
#
# Alur: DB sementara <DB_DATABASE>_golden_build -> container sekali pakai (APP_ENV=local, image
# yang sama dengan yang berjalan) menjalankan migrate --force + db:seed --force -> pg_dump -Fc
# tanpa data sessions/cache/queue -> backups/ + sha256 + metadata -> DB sementara dihapus.
# Hanya mode DB local. DB aplikasi yang berjalan tidak disentuh.
set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

TAG_ARG=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --tag)
      [ "$#" -ge 2 ] || { echo "Pemakaian: $0 [--tag <tag>]" >&2; exit 2; }
      TAG_ARG="$2"
      shift
      ;;
    --tag=*) TAG_ARG="${1#--tag=}" ;;
    -h|--help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opsi tidak dikenal: $1" >&2; exit 2 ;;
  esac
  shift
done

require_docker
load_compose_env
MODE="$(current_db_mode)"
[ "$MODE" = "local" ] || die "make-golden hanya untuk mode DB local (mode sekarang: $MODE). Neon tidak pernah disentuh."
use_db_mode local

TAG="${TAG_ARG:-$(state_get current_tag)}"
[ -n "$TAG" ] || die "tag tidak diketahui (belum pernah deploy?). Pakai --tag <tag>."
use_tag "$TAG"
docker image inspect "$SID_REGISTRY/sid-api:$TAG" >/dev/null 2>&1 \
  || die "image $SID_REGISTRY/sid-api:$TAG tidak ada di mesin ini (deploy/pull dulu)."

require_private_file "$SID_ENV_FILE"
DB_NAME="$(env_get "$SID_ENV_FILE" DB_DATABASE)"
DB_USER="$(env_get "$SID_ENV_FILE" DB_USERNAME)"
[ -n "$DB_NAME" ] && [ -n "$DB_USER" ] || die "DB_DATABASE/DB_USERNAME kosong di $SID_ENV_FILE."
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || die "DB_DATABASE hanya boleh huruf/angka/underscore."
[[ "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]] || die "DB_USERNAME hanya boleh huruf/angka/underscore."
GOLDEN_DB="${DB_NAME}_golden_build"

[ "$(container_state "$SID_C_DB")" = "healthy" ] || die "$SID_C_DB tidak sehat/tidak berjalan. Jalankan deploy dulu."

acquire_lock
mkdir -p "$SID_BACKUP_DIR"
STAMP="$(date '+%Y%m%d-%H%M%S')"
BASE_NAME="golden-${TAG}-${STAMP}"
DUMP="$SID_BACKUP_DIR/$BASE_NAME.dump"
CREATED_DB=0

psql_admin() {
  docker exec -i "$SID_C_DB" psql -v ON_ERROR_STOP=1 -X -q -U "$DB_USER" -d postgres "$@"
}

cleanup() {
  local rc=$?
  if [ "$CREATED_DB" -eq 1 ]; then
    if psql_admin -c "DROP DATABASE IF EXISTS \"$GOLDEN_DB\" WITH (FORCE);" >/dev/null 2>&1; then
      info "DB sementara $GOLDEN_DB dihapus."
    else
      warn "gagal menghapus DB sementara $GOLDEN_DB; hapus manual."
    fi
  fi
  if [ "$rc" -ne 0 ]; then
    # Hanya berkas milik proses ini yang dihapus.
    rm -f "$DUMP" "$DUMP.sha256" "$DUMP.meta"
  fi
  release_lock
}
trap cleanup EXIT

info "membangun golden dari seed segar (image $TAG) di DB sementara $GOLDEN_DB..."
psql_admin -c "DROP DATABASE IF EXISTS \"$GOLDEN_DB\" WITH (FORCE);"
psql_admin -c "CREATE DATABASE \"$GOLDEN_DB\" OWNER \"$DB_USER\";"
CREATED_DB=1

# Seeder demo menolak APP_ENV=production -> container sekali pakai dengan APP_ENV=local.
GOLDEN_ENV=(-e APP_ENV=local -e APP_DEBUG=false -e "DB_DATABASE=$GOLDEN_DB" -e LOG_CHANNEL=stderr)
dc run --rm --no-deps -T "${GOLDEN_ENV[@]}" sid_api php artisan migrate --force \
  || die "migrate pada DB golden gagal."
dc run --rm --no-deps -T "${GOLDEN_ENV[@]}" sid_api php artisan db:seed --force \
  || die "db:seed pada DB golden gagal."

info "pg_dump (tanpa data sessions/cache/queue)..."
docker exec "$SID_C_DB" pg_dump -U "$DB_USER" -d "$GOLDEN_DB" -Fc --no-owner --no-acl \
  --exclude-table-data=sessions \
  --exclude-table-data=cache \
  --exclude-table-data=cache_locks \
  --exclude-table-data=jobs \
  --exclude-table-data=job_batches \
  --exclude-table-data=failed_jobs \
  > "$DUMP" || die "pg_dump gagal."
[ -s "$DUMP" ] || die "dump kosong."

# Dump dialirkan lewat stdout/stdin (biner, tanpa docker cp / path host), aman juga di Windows.
TABLES="$(docker exec -i "$SID_C_DB" pg_restore --list < "$DUMP" | grep -c ' TABLE DATA ' || true)"

SUM="$(sha256_of "$DUMP")"
printf '%s  %s\n' "$SUM" "$BASE_NAME.dump" > "$DUMP.sha256"
{
  echo "image_tag=$TAG"
  echo "api_image=$SID_REGISTRY/sid-api:$TAG"
  echo "created=$(date '+%Y-%m-%dT%H:%M:%S%z')"
  echo "source_db=$GOLDEN_DB"
  echo "table_data_entries=$TABLES"
  echo "sha256=$SUM"
} > "$DUMP.meta"
chmod 600 "$DUMP" "$DUMP.sha256" "$DUMP.meta"
# Penunjuk golden aktif (dipakai reset-demo.sh).
printf '%s\n' "$BASE_NAME.dump" > "$SID_BACKUP_DIR/golden-current"

log_line "golden OK $BASE_NAME.dump sha256=$SUM tag=$TAG"
info "GOLDEN OK"
info "  dump    : $DUMP ($(wc -c < "$DUMP" | tr -d ' ') byte)"
info "  sha256  : $SUM"
info "  isi     : $TABLES entri TABLE DATA (pg_restore --list)"
info "  aktif   : $SID_BACKUP_DIR/golden-current -> $BASE_NAME.dump"
warn "SALIN dump + .sha256 + .meta ke LUAR laptop (flashdisk/cloud tim) sekarang."
