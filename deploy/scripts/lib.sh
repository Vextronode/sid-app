#!/usr/bin/env bash
# shellcheck shell=bash
# Variabel global (SID_REPO_DIR, SID_BACKUP_DIR, SID_C_*) dipakai skrip yang men-source file ini.
# shellcheck disable=SC2034
# Pustaka bersama skrip operasi SID (di-source oleh deploy.sh, smoke.sh, make-golden.sh, reset-demo.sh).
#
# Bila dijalankan langsung, berfungsi sebagai pembungkus docker compose dengan tag dan mode DB aktif:
#   bash deploy/scripts/lib.sh ps
#   bash deploy/scripts/lib.sh logs --tail 50 sid_api
#
# Variabel yang dihormati:
#   SID_CONFIG_DIR  lokasi compose.env, sid.env, sid.neon.env, smoke.env, .state/, backups/ (default: deploy/)
#   SID_PROJECT     nama proyek compose (default: dari compose.env, lalu "sid")

# Git Bash / MSYS di Windows (Docker Desktop).
is_windows_shell() {
  case "$(uname -s 2>/dev/null)" in
    MINGW*|MSYS*|CYGWIN*) return 0 ;;
  esac
  return 1
}

# Path yang dipahami bash DAN docker.exe: di Windows bentuk C:/..., selain itu apa adanya.
host_path() {
  if is_windows_shell && command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
  else
    printf '%s' "$1"
  fi
}

SID_SCRIPTS_DIR="$(host_path "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
SID_DEPLOY_DIR="$(host_path "$(cd "$SID_SCRIPTS_DIR/.." && pwd)")"
SID_REPO_DIR="$(host_path "$(cd "$SID_DEPLOY_DIR/.." && pwd)")"
SID_COMPOSE_FILE="$SID_DEPLOY_DIR/docker-compose.yml"
SID_CONFIG_DIR="$(host_path "${SID_CONFIG_DIR:-$SID_DEPLOY_DIR}")"
SID_STATE_DIR="$SID_CONFIG_DIR/.state"
SID_BACKUP_DIR="$SID_CONFIG_DIR/backups"
SID_TAG_RE='^v[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?$'
SID_LOCK_DIR=""

# ---------- Pesan ----------
info() { printf '[sid] %s\n' "$*"; }
warn() { printf '[sid] PERINGATAN: %s\n' "$*" >&2; }
die() {
  printf '[sid] GAGAL: %s\n' "$*" >&2
  log_line "GAGAL: $*"
  exit 1
}

log_line() {
  if [ -d "$SID_STATE_DIR" ]; then
    printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*" >> "$SID_STATE_DIR/deploy.log" 2>/dev/null || true
  fi
}

# ---------- Utilitas ----------
require_docker() {
  command -v docker >/dev/null 2>&1 || die "perintah docker tidak ditemukan."
  docker info >/dev/null 2>&1 || die "daemon Docker tidak terjangkau (Docker belum jalan?)."
  docker compose version >/dev/null 2>&1 || die "docker compose v2 tidak tersedia."
}

# Izin file dalam oktal (Linux: stat -c, macOS/BSD: stat -f).
file_mode() {
  stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"
}

# File rahasia harus 600. Dicoba diperbaiki otomatis (chmod 600); di filesystem
# Windows (NTFS lewat Git Bash) izin unix tidak berlaku -> hanya peringatan.
# Return 0 = boleh dipakai.
ensure_private_file() {
  local f="$1"
  [ "$(file_mode "$f")" = "600" ] && return 0
  chmod 600 "$f" 2>/dev/null || true
  if [ "$(file_mode "$f")" = "600" ]; then
    info "izin $f diperbaiki menjadi 600."
    return 0
  fi
  if is_windows_shell; then
    warn "izin $f tidak bisa 600 di filesystem Windows; dilanjutkan (pastikan folder hanya bisa diakses akun ini)."
    return 0
  fi
  return 1
}

require_private_file() {
  local f="$1"
  [ -f "$f" ] || die "file tidak ada: $f (salin dari template *.example)."
  ensure_private_file "$f" || die "izin $f = $(file_mode "$f"); harus 600 dan chmod gagal (pemilik file berbeda?)."
}

# Membaca nilai KEY dari file env tanpa mengeksekusinya (baris terakhir menang).
env_get() {
  local file="$1" key="$2" line val
  line="$(grep -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | tail -n 1 || true)"
  [ -n "$line" ] || return 0
  val="${line#*=}"
  val="${val%$'\r'}"
  case "$val" in
    \"*\") val="${val#\"}"; val="${val%\"}" ;;
    \'*\') val="${val#\'}"; val="${val%\'}" ;;
  esac
  printf '%s' "$val"
}

# Gagal bila masih ada placeholder <...> pada baris yang bukan komentar.
check_placeholders() {
  local f="$1" hits
  hits="$(grep -nE '^[[:space:]]*[^#[:space:]][^#]*<[A-Za-z0-9_.-]+>' "$f" | sed -E 's/=.*//' || true)"
  [ -z "$hits" ] || die "placeholder <...> belum diganti di $f pada: $(echo "$hits" | tr '\n' ' ')"
}

valid_tag() {
  [ "$1" != "latest" ] && [[ "$1" =~ $SID_TAG_RE ]]
}

# confirm "pesan" [kata]: lanjut hanya bila pengguna mengetik kata (default "ya").
confirm() {
  local msg="$1" word="${2:-ya}" ans
  if [ "${SID_ASSUME_YES:-0}" = "1" ]; then
    return 0
  fi
  # Tanpa cek tty: mintty (Git Bash) bukan tty tetapi tetap bisa diketik.
  printf '%s Ketik %s untuk lanjut (atau jalankan dengan --yes): ' "$msg" "$word"
  if ! read -r ans; then
    ans=""
  fi
  ans="${ans%$'\r'}"
  [ "$ans" = "$word" ]
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# ---------- Konfigurasi & state ----------
load_compose_env() {
  local f="$SID_CONFIG_DIR/compose.env" v
  [ -f "$f" ] || die "tidak ada $f (salin dari compose.env.example)."
  v="$(env_get "$f" SID_PROJECT)"
  SID_PROJECT="${SID_PROJECT:-${v:-sid}}"
  v="$(env_get "$f" SID_HTTP_PORT)"
  SID_HTTP_PORT="${SID_HTTP_PORT:-${v:-8100}}"
  v="$(env_get "$f" SID_REGISTRY)"
  SID_REGISTRY="${SID_REGISTRY:-$v}"
  export SID_PROJECT SID_HTTP_PORT SID_REGISTRY
  SID_C_DB="${SID_PROJECT}_db"
  SID_C_API="${SID_PROJECT}_api"
  SID_C_WEB="${SID_PROJECT}_web"
}

state_get() {
  local f="$SID_STATE_DIR/$1"
  if [ -f "$f" ]; then
    tr -d '[:space:]' < "$f"
  fi
}

state_set() {
  mkdir -p "$SID_STATE_DIR"
  printf '%s\n' "$2" > "$SID_STATE_DIR/$1.tmp"
  mv -f "$SID_STATE_DIR/$1.tmp" "$SID_STATE_DIR/$1"
}

current_db_mode() {
  local m
  m="$(state_get db_mode)"
  printf '%s' "${m:-local}"
}

# Mengekspor SID_ENV_FILE dan COMPOSE_PROFILES menurut mode DB.
use_db_mode() {
  case "$1" in
    local)
      SID_ENV_FILE="$SID_CONFIG_DIR/sid.env"
      COMPOSE_PROFILES=localdb
      ;;
    neon)
      SID_ENV_FILE="$SID_CONFIG_DIR/sid.neon.env"
      COMPOSE_PROFILES=
      ;;
    *) die "mode DB tidak dikenal: $1 (local|neon)" ;;
  esac
  SID_DB_MODE="$1"
  export SID_ENV_FILE COMPOSE_PROFILES SID_DB_MODE
}

use_tag() {
  valid_tag "$1" || die "tag tidak valid: '$1' (format vX.Y.Z atau vX.Y.Z-label; bukan latest)."
  SID_IMAGE_TAG="$1"
  export SID_IMAGE_TAG
}

dc() {
  docker compose -p "$SID_PROJECT" -f "$SID_COMPOSE_FILE" --env-file "$SID_CONFIG_DIR/compose.env" "$@"
}

# Kunci sederhana agar deploy/golden/reset tidak berjalan bersamaan.
acquire_lock() {
  mkdir -p "$SID_STATE_DIR"
  SID_LOCK_DIR="$SID_STATE_DIR/lock"
  if ! mkdir "$SID_LOCK_DIR" 2>/dev/null; then
    die "operasi lain sedang berjalan ($SID_LOCK_DIR ada). Jika yakin tidak ada, hapus direktori itu."
  fi
  printf '%s %s\n' "$$" "$(basename "$0")" > "$SID_LOCK_DIR/owner"
}

release_lock() {
  if [ -n "$SID_LOCK_DIR" ] && [ -d "$SID_LOCK_DIR" ]; then
    rm -f "$SID_LOCK_DIR/owner"
    rmdir "$SID_LOCK_DIR" 2>/dev/null || true
  fi
}

# ---------- Container ----------
container_state() {
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || echo "tidak-ada"
}

# wait_healthy <container> <detik>: tunggu healthy; gagal -> cetak 20 baris log terakhir.
wait_healthy() {
  local c="$1" timeout="${2:-120}" waited=0 st
  while [ "$waited" -lt "$timeout" ]; do
    st="$(container_state "$c")"
    case "$st" in
      healthy) info "$c sehat (${waited}s)."; return 0 ;;
      unhealthy|exited|dead) break ;;
    esac
    sleep 2
    waited=$((waited + 2))
  done
  warn "$c tidak sehat (status: $(container_state "$c"), ${waited}s). 20 baris log terakhir:"
  docker logs --tail 20 "$c" 2>&1 | sed 's/^/    /' >&2 || true
  return 1
}

# Menjalankan lib.sh langsung = pembungkus docker compose dengan tag/mode aktif.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  set -euo pipefail
  [ "$#" -gt 0 ] || { echo "Pemakaian: bash $0 <argumen docker compose>  (mis. ps, logs sid_api)"; exit 2; }
  load_compose_env
  use_db_mode "$(current_db_mode)"
  tag="$(state_get current_tag)"
  [ -n "$tag" ] || tag="$(env_get "$SID_CONFIG_DIR/compose.env" SID_IMAGE_TAG)"
  use_tag "$tag"
  dc "$@"
fi
