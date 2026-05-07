#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/JT-Company/snowsign-skills}"
REF="${REF:-main}"
PROJECT_DIR="${SNOWSIGN_PROJECT_DIR:-$PWD}"
INSTALL_DIR="${SNOWSIGN_MCP_DIR:-$PROJECT_DIR/.snowsign/mcp-repo}"
SERVER_NAME="${SERVER_NAME:-snowsign}"
TARGET="${1:-project}"
SERVER_FILE=""

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
  bash install-mcp.sh project
  bash install-mcp.sh project-claude
  bash install-mcp.sh project-both
  bash install-mcp.sh codex
  bash install-mcp.sh claude
  bash install-mcp.sh both

설치 범위/클라이언트:
  project                   현재 프로젝트 / Codex
  project-claude            현재 프로젝트 / Claude Code
  project-both              현재 프로젝트 / Codex + Claude Code
  codex                     내 계정 전역 / Codex
  claude                    내 계정 전역 / Claude Code
  both                      내 계정 전역 / Codex + Claude Code

환경변수:
  REPO_URL                  GitHub 저장소 URL
  REF                       브랜치 또는 refs/heads/<branch> 기준 브랜치명
  SNOWSIGN_PROJECT_DIR      프로젝트 설정을 생성할 디렉토리, 기본값은 현재 디렉토리
  SNOWSIGN_MCP_DIR          MCP 서버 파일을 설치할 로컬 디렉토리, 기본값은 ./.snowsign/mcp-repo
USAGE
}

archive_url() {
  printf '%s/archive/refs/heads/%s.tar.gz' "${REPO_URL%/}" "$REF"
}

download_repo() {
  local tmp
  local root

  if [ -z "${FORCE_REMOTE:-}" ] \
    && [ -z "${SNOWSIGN_MCP_DIR:-}" ] \
    && [ -f "$PROJECT_DIR/mcp/snowsign_mcp.mjs" ] \
    && [ -d "$PROJECT_DIR/skills/snowsign-integration-architect" ] \
    && [ -f "$PROJECT_DIR/scripts/install.mjs" ]; then
    SERVER_FILE="$PROJECT_DIR/mcp/snowsign_mcp.mjs"
    chmod +x "$SERVER_FILE"
    echo "현재 프로젝트의 SnowSign MCP 서버 파일을 사용합니다."
    return
  fi

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
  mkdir -p "$INSTALL_DIR/mcp"
  mkdir -p "$INSTALL_DIR/skills/snowsign-integration-architect/references"
  cp "$root/mcp/snowsign_mcp.mjs" "$INSTALL_DIR/mcp/snowsign_mcp.mjs"
  cp "$root/skills/snowsign-integration-architect/references/public-api-guide.md" "$INSTALL_DIR/skills/snowsign-integration-architect/references/public-api-guide.md"
  SERVER_FILE="$INSTALL_DIR/mcp/snowsign_mcp.mjs"
  chmod +x "$SERVER_FILE"
}

register_project() {
  local server_file="$SERVER_FILE"

  echo "현재 프로젝트에 SnowSign MCP 설정을 생성합니다..."
  node - "$PROJECT_DIR" "$server_file" "$TARGET" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const projectDir = path.resolve(process.argv[2]);
const serverFile = path.resolve(process.argv[3]);
const target = process.argv[4];
const serverPath = path.relative(projectDir, serverFile).split(path.sep).join("/");

function mkdirFor(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function tomlString(value) {
  return JSON.stringify(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function writeManagedBlock(file, startMarker, endMarker, block) {
  mkdirFor(file);
  const nextBlock = `${startMarker}\n${block.trimEnd()}\n${endMarker}`;
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `${nextBlock}\n`);
    return;
  }

  const current = fs.readFileSync(file, "utf8");
  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (pattern.test(current)) {
    fs.writeFileSync(file, current.replace(pattern, nextBlock));
    return;
  }

  const separator = current.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(file, `${current}${separator}${nextBlock}\n`);
}

const codexConfig = path.join(projectDir, ".codex", "config.toml");
if (target === "project" || target === "project-both") {
  writeManagedBlock(
    codexConfig,
    "# BEGIN SnowSign MCP",
    "# END SnowSign MCP",
    `
[mcp_servers.snowsign]
command = "node"
args = [${tomlString(serverPath)}]
cwd = "."
env_vars = ["SNOWSIGN_API_KEY"]
`,
  );
  console.log(`Codex MCP 설정: ${codexConfig}`);
}

const claudeConfig = path.join(projectDir, ".mcp.json");
if (target === "project-claude" || target === "project-both") {
  let config = {};
  if (fs.existsSync(claudeConfig)) {
    config = JSON.parse(fs.readFileSync(claudeConfig, "utf8"));
  }
  config.mcpServers = config.mcpServers && typeof config.mcpServers === "object" ? config.mcpServers : {};
  config.mcpServers.snowsign = {
    command: "node",
    args: [serverPath],
    env: {
      SNOWSIGN_API_KEY: "${SNOWSIGN_API_KEY}",
    },
  };
  fs.writeFileSync(claudeConfig, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Claude MCP 설정: ${claudeConfig}`);
}
NODE
}

register_codex() {
  if ! command -v codex >/dev/null 2>&1; then
    echo "codex 명령어가 없어 Codex MCP 등록을 건너뜁니다."
    return
  fi

  echo "Codex MCP 서버를 등록합니다..."
  codex mcp add "$SERVER_NAME" -- node "$SERVER_FILE"
}

register_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "claude 명령어가 없어 Claude Code MCP 등록을 건너뜁니다."
    return
  fi

  echo "Claude Code MCP 서버를 등록합니다..."
  claude mcp add --transport stdio "$SERVER_NAME" -- node "$SERVER_FILE"
}

main() {
  case "$TARGET" in
    project|project-claude|project-both|codex|claude|both)
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
    project|project-claude|project-both)
      register_project
      ;;
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
  echo "  $SERVER_FILE"
  echo
  echo "이제 MCP 클라이언트에서 ${SERVER_NAME} 서버의 SnowSign API 도구를 사용할 수 있습니다."
  echo "- snowsign_list_contracts"
  echo "- snowsign_create_contract_from_template"
  echo "- snowsign_get_api_reference_section"
}

main "$@"
