#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/JT-Company/snowsign-skills}"
REF="${REF:-main}"
INSTALL_DIR="${SNOWSIGN_MCP_DIR:-$HOME/.snowsign/mcp-repo}"
SERVER_NAME="${SERVER_NAME:-snowsign}"
TARGET="${1:-both}"

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

usage() {
  cat <<'USAGE'
사용법:
  bash install-mcp.sh
  bash install-mcp.sh codex
  bash install-mcp.sh claude
  bash install-mcp.sh both

환경변수:
  REPO_URL                  GitHub 저장소 URL
  REF                       브랜치 또는 refs/heads/<branch> 기준 브랜치명
  SNOWSIGN_MCP_DIR          MCP 서버 파일을 설치할 로컬 디렉토리
USAGE
}

archive_url() {
  printf '%s/archive/refs/heads/%s.tar.gz' "${REPO_URL%/}" "$REF"
}

download_repo() {
  local tmp
  local root

  need curl
  need tar
  need mktemp
  need find

  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  echo "${REPO_URL} (${REF})에서 SnowSign MCP 서버 파일을 다운로드합니다..."
  curl -fsSL "$(archive_url)" | tar -xz -C "$tmp"

  root="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [ -z "$root" ] || [ ! -f "$root/mcp/snowsign_mcp.mjs" ]; then
    echo "다운로드한 압축 파일에서 MCP 서버 파일을 찾지 못했습니다." >&2
    echo "REPO_URL과 REF 값을 확인하세요." >&2
    exit 1
  fi

  rm -rf "$INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  cp -R "$root" "$INSTALL_DIR"
  chmod +x "$INSTALL_DIR/mcp/snowsign_mcp.mjs"
}

register_codex() {
  if ! command -v codex >/dev/null 2>&1; then
    echo "codex 명령어가 없어 Codex MCP 등록을 건너뜁니다."
    return
  fi

  echo "Codex MCP 서버를 등록합니다..."
  codex mcp add "$SERVER_NAME" -- node "$INSTALL_DIR/mcp/snowsign_mcp.mjs"
}

register_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "claude 명령어가 없어 Claude Code MCP 등록을 건너뜁니다."
    return
  fi

  echo "Claude Code MCP 서버를 등록합니다..."
  claude mcp add --transport stdio "$SERVER_NAME" -- node "$INSTALL_DIR/mcp/snowsign_mcp.mjs"
}

main() {
  case "$TARGET" in
    codex|claude|both)
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 대상입니다: $TARGET" >&2
      usage
      exit 1
      ;;
  esac

  need_node_18
  download_repo

  case "$TARGET" in
    codex)
      register_codex
      ;;
    claude)
      register_claude
      ;;
    both)
      register_codex
      register_claude
      ;;
  esac

  echo
  echo "MCP 서버 파일:"
  echo "  $INSTALL_DIR/mcp/snowsign_mcp.mjs"
  echo
  echo "이제 MCP 클라이언트에서 ${SERVER_NAME} 서버의 SnowSign API 도구를 사용할 수 있습니다."
  echo "- snowsign_list_contracts"
  echo "- snowsign_create_contract"
  echo "- snowsign_get_api_reference_section"
}

main "$@"
