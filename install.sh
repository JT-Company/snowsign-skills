#!/usr/bin/env bash
set -euo pipefail

# 저장소 공개 후 실제 GitHub URL로 바꾸거나, 실행 시 REPO_URL을 직접 넘기세요.
#   REPO_URL=https://github.com/JT-Company/snowsign-skills bash install.sh
# 기본 설치 대상은 현재 프로젝트입니다. 사용자 전역 설치가 필요하면 --codex, --claude, --both를 명시하세요.
REPO_URL="${REPO_URL:-https://github.com/JT-Company/snowsign-skills}"
REF="${REF:-main}"

ROOT=""
TMP_DIR=""

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "필수 명령어가 없습니다: $1" >&2
    exit 1
  fi
}

need_node_18() {
  need node

  if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' >/dev/null 2>&1; then
    echo "Node.js 18 이상이 필요합니다." >&2
    exit 1
  fi
}

cleanup() {
  if [ -n "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

repo_archive_url() {
  printf '%s/archive/refs/heads/%s.tar.gz' "${REPO_URL%/}" "$REF"
}

prepare_source() {
  if [ -f "./scripts/install.mjs" ] && [ -d "./skills" ] && [ -z "${FORCE_REMOTE:-}" ]; then
    ROOT="$(pwd)"
    return
  fi

  need curl
  need tar
  need mktemp
  need find

  TMP_DIR="$(mktemp -d)"
  echo "${REPO_URL} (${REF})에서 스노우싸인 설치 파일을 다운로드합니다..."
  curl -fsSL "$(repo_archive_url)" | tar -xz -C "$TMP_DIR"

  ROOT="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [ -z "$ROOT" ] || [ ! -f "$ROOT/scripts/install.mjs" ] || [ ! -d "$ROOT/skills" ]; then
    echo "다운로드한 압축 파일에서 설치 파일을 찾지 못했습니다." >&2
    echo "REPO_URL과 REF 값을 확인하세요." >&2
    exit 1
  fi
}

main() {
  trap cleanup EXIT

  need_node_18
  prepare_source
  node "$ROOT/scripts/install.mjs" "$@"
}

main "$@"
