#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { emitKeypressEvents } from "node:readline";
import { spawnSync } from "node:child_process";
import tty from "node:tty";
import { fileURLToPath } from "node:url";

const APP_NAME = "스노우싸인 스킬 설치";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = process.cwd();
const skillsRoot = path.join(repoRoot, "skills");
const claudeDestDir = process.env.CLAUDE_SKILLS_DIR || path.join(os.homedir(), ".claude", "skills");
const codexDestDir = process.env.CODEX_SKILLS_DIR || path.join(os.homedir(), ".agents", "skills");
const projectSkillsDir = process.env.SNOWSIGN_PROJECT_SKILLS_DIR || path.join(projectRoot, ".agents", "skills");
const mcpInstallDir = process.env.SNOWSIGN_MCP_DIR || path.join(projectRoot, ".snowsign", "mcp-repo");

const scopeOptions = [
  {
    label: "현재 프로젝트",
    value: "project",
    mcpDescription: "이 프로젝트에 MCP 설정과 스킬을 설치합니다.",
    skillDescription: "이 프로젝트 안에 스킬을 설치합니다.",
  },
  {
    label: "내 계정 전역",
    value: "user",
    mcpDescription: "내 계정 전역에 MCP를 등록하고 스킬을 설치합니다.",
    skillDescription: "내 계정의 기본 스킬 경로에 설치합니다.",
  },
  {
    label: "원하는 경로",
    value: "custom",
    mcpDescription: "스킬을 원하는 경로에 복사하고 MCP 서버 파일 경로를 안내합니다.",
    skillDescription: "스킬을 원하는 경로에 복사합니다.",
  },
];

const clientOptions = [
  {
    label: "Codex",
    value: "codex",
    mcpDescription: "Codex용 MCP 설정과 Codex 스킬 경로를 사용합니다.",
    skillDescription: "Codex 기본 스킬 경로를 사용합니다.",
  },
  {
    label: "Claude Code",
    value: "claude",
    mcpDescription: "Claude Code용 MCP 설정과 Claude Code 스킬 경로를 사용합니다.",
    skillDescription: "Claude Code 기본 스킬 경로를 사용합니다.",
  },
  {
    label: "Codex + Claude Code",
    value: "both",
    mcpDescription: "두 클라이언트 모두에 MCP 설정과 스킬을 설치합니다.",
    skillDescription: "두 클라이언트의 기본 스킬 경로에 설치합니다.",
  },
];

const setupOptions = [
  {
    label: "개발용",
    value: "dev",
    description: "API 문서와 연동 구현 참고용 스킬만 설치합니다.",
    skills: ["snowsign-api-reference"],
  },
  {
    label: "운영용",
    value: "ops",
    description: "계약 업무 처리 절차를 위한 운영형 스킬을 설치합니다.",
    skills: ["snowsign-contract-operator"],
  },
  {
    label: "전체",
    value: "full",
    description: "개발용과 운영용 스킬을 모두 설치합니다.",
    skills: ["snowsign-api-reference", "snowsign-contract-operator"],
  },
];

const state = {
  targetMode: "ask",
  scopeMode: "ask",
  clientMode: "ask",
  setupMode: "ask",
  skillArgs: [],
  customDestDir: "",
};

function printUsage() {
  console.log(`사용법:
  bash install.sh
  bash install.sh --project --mode=full
  bash install.sh --all
  bash install.sh --codex --all
  bash install.sh --claude snowsign-contract-operator
  bash install.sh --both snowsign-contract-operator snowsign-api-reference
  bash install.sh --mode=dev
  bash install.sh --mode=ops
  bash install.sh --mode=full
  node scripts/install.mjs --all

옵션:
  --project         현재 프로젝트에만 MCP 설정 생성
  --claude          Claude Code 사용자 위치에 스킬 설치, 운영/전체는 MCP도 등록
  --codex           Codex 사용자 위치에 스킬 설치, 운영/전체는 MCP도 등록
  --both            Claude Code와 Codex 양쪽에 스킬 설치, 운영/전체는 MCP도 등록
  --all             모든 스킬 설치
  --scope=<범위>    project, user, custom 중 하나
  --client=<대상>   codex, claude, both 중 하나
  --target=<대상>   project, project-claude, project-both, claude, codex, both, custom 중 하나
  --dest=<경로>      --target=custom일 때 사용할 스킬 설치 경로
  --mode=<구성>     dev, ops, full 중 하나

환경변수:
  CLAUDE_SKILLS_DIR Claude Code 스킬 설치 경로
  CODEX_SKILLS_DIR  Codex 스킬 설치 경로
  SNOWSIGN_MCP_DIR  MCP 서버 파일 설치 경로, 기본값은 ./.snowsign/mcp-repo
  SNOWSIGN_API_KEY  설치 중 추가 입력 없이 현재 값을 사용`);
}

function parseArgs(args) {
  for (const arg of args) {
    switch (arg) {
      case "--project":
        state.targetMode = "project";
        state.scopeMode = "project";
        state.clientMode = "codex";
        break;
      case "--claude":
        state.targetMode = "claude";
        state.scopeMode = "user";
        state.clientMode = "claude";
        break;
      case "--codex":
        state.targetMode = "codex";
        state.scopeMode = "user";
        state.clientMode = "codex";
        break;
      case "--both":
        state.targetMode = "both";
        state.scopeMode = "user";
        state.clientMode = "both";
        break;
      case "--all":
      case "all":
        state.skillArgs.push("all");
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--target=")) {
          const target = arg.slice("--target=".length);
          if (!["project", "project-claude", "project-both", "claude", "codex", "both", "custom"].includes(target)) {
            throw new Error(`알 수 없는 설치 대상입니다: ${target}`);
          }
          state.targetMode = target;
          applyTargetMode(target);
        } else if (arg.startsWith("--scope=")) {
          const scope = arg.slice("--scope=".length);
          if (!["project", "user", "custom"].includes(scope)) {
            throw new Error(`알 수 없는 설치 범위입니다: ${scope}`);
          }
          state.scopeMode = scope;
          state.targetMode = "ask";
        } else if (arg.startsWith("--client=")) {
          const client = arg.slice("--client=".length);
          if (!["codex", "claude", "both"].includes(client)) {
            throw new Error(`알 수 없는 클라이언트입니다: ${client}`);
          }
          state.clientMode = client;
          state.targetMode = "ask";
        } else if (arg.startsWith("--dest=")) {
          state.customDestDir = arg.slice("--dest=".length);
        } else if (arg.startsWith("--mode=")) {
          const mode = arg.slice("--mode=".length);
          if (!["dev", "ops", "full"].includes(mode)) {
            throw new Error(`알 수 없는 설치 구성입니다: ${mode}`);
          }
          state.setupMode = mode;
        } else if (arg.startsWith("--")) {
          throw new Error(`알 수 없는 옵션입니다: ${arg}`);
        } else {
          state.skillArgs.push(arg);
        }
    }
  }

  if (state.targetMode === "ask" && state.skillArgs.length > 0) {
    state.scopeMode = state.scopeMode === "ask" ? "project" : state.scopeMode;
    state.clientMode = state.clientMode === "ask" ? "codex" : state.clientMode;
  }

  if (state.setupMode === "ask" && state.skillArgs.length > 0) {
    state.setupMode = "full";
  }
}

function applyTargetMode(targetMode) {
  const mapping = {
    project: ["project", "codex"],
    "project-claude": ["project", "claude"],
    "project-both": ["project", "both"],
    codex: ["user", "codex"],
    claude: ["user", "claude"],
    both: ["user", "both"],
    custom: ["custom", "both"],
  };
  const [scopeMode, clientMode] = mapping[targetMode] || ["ask", "ask"];
  state.scopeMode = scopeMode;
  state.clientMode = clientMode;
}

function parseFrontmatterValue(content, key) {
  if (!content.startsWith("---\n")) return "";

  const end = content.indexOf("\n---", 4);
  if (end === -1) return "";

  const lines = content.slice(4, end).split(/\r?\n/);
  const prefix = `${key}:`;

  for (const line of lines) {
    if (!line.startsWith(prefix)) continue;
    return line
      .slice(prefix.length)
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  return "";
}

function loadSkills() {
  if (!fs.existsSync(skillsRoot)) {
    throw new Error(`skills 디렉토리를 찾지 못했습니다: ${skillsRoot}`);
  }

  const skills = fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(skillsRoot, entry.name);
      const skillFile = path.join(dir, "SKILL.md");
      if (!fs.existsSync(skillFile)) return null;

      const content = fs.readFileSync(skillFile, "utf8");
      return {
        dir,
        name: parseFrontmatterValue(content, "name") || entry.name,
        description: parseFrontmatterValue(content, "description") || "설명이 없습니다.",
      };
    })
    .filter(Boolean);

  if (skills.length === 0) {
    throw new Error("설치할 스킬을 찾지 못했습니다.");
  }

  return skills;
}

function createTerminal() {
  try {
    const inputFd = fs.openSync("/dev/tty", "r");
    const outputFd = fs.openSync("/dev/tty", "w");
    const input = new tty.ReadStream(inputFd);
    const output = new tty.WriteStream(outputFd);
    return { input, output, isTTY: true };
  } catch {
    return { input: process.stdin, output: process.stdout, isTTY: process.stdin.isTTY && process.stdout.isTTY };
  }
}

const terminal = createTerminal();
let outputCapture = null;
let interactiveFrameLines = 0;
let interactiveScreenCleared = false;

function rawWrite(text = "") {
  terminal.output.write(text);
}

function write(text = "") {
  if (outputCapture) {
    outputCapture.push(text);
    return;
  }

  rawWrite(text);
}

function writeln(text = "") {
  write(`${text}\n`);
}

function color(code, text) {
  if (!terminal.isTTY) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

function style(codes, text) {
  if (!terminal.isTTY) return text;
  return `\u001b[${codes}m${text}\u001b[0m`;
}

function clear() {
  if (terminal.isTTY) write("\u001b[2J\u001b[H");
}

function captureOutput(fn) {
  const previousCapture = outputCapture;
  outputCapture = [];

  try {
    fn();
    return outputCapture.join("");
  } finally {
    outputCapture = previousCapture;
  }
}

function outputLineCount(text) {
  const lines = text.split("\n").length - 1;
  return text.endsWith("\n") ? lines : lines + 1;
}

function clearInteractiveFrame() {
  if (!terminal.isTTY || interactiveFrameLines === 0) return;
  rawWrite(`\u001b[${interactiveFrameLines}F\u001b[J`);
  interactiveFrameLines = 0;
}

function renderInteractiveFrame(fn) {
  const text = captureOutput(fn);

  if (!terminal.isTTY) {
    rawWrite(text);
    return;
  }

  if (!interactiveScreenCleared) {
    rawWrite("\u001b[2J\u001b[H");
    interactiveScreenCleared = true;
  } else {
    clearInteractiveFrame();
  }

  rawWrite(text);
  interactiveFrameLines = outputLineCount(text);
}

function hideCursor() {
  if (terminal.isTTY) write("\u001b[?25l");
}

function showCursor() {
  if (terminal.isTTY) write("\u001b[?25h");
}

function terminalWidth() {
  const width = terminal.output.columns || process.stdout.columns || 88;
  return Math.max(72, Math.min(112, width));
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function charWidth(char) {
  const code = char.codePointAt(0);
  if (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff01 && code <= 0xff60)
  ) {
    return 2;
  }

  return 1;
}

function visibleLength(text) {
  return Array.from(stripAnsi(text)).reduce((width, char) => width + charWidth(char), 0);
}

function padEndVisible(text, width) {
  return `${text}${" ".repeat(Math.max(0, width - visibleLength(text)))}`;
}

function truncate(text, width) {
  let result = "";
  let currentWidth = 0;

  for (const char of Array.from(text)) {
    const nextWidth = currentWidth + charWidth(char);
    if (nextWidth > width) break;
    result += char;
    currentWidth = nextWidth;
  }

  return result === text ? text : `${result.slice(0, Math.max(0, result.length - 3))}...`;
}

function divider(width = terminalWidth()) {
  return color(36, "─".repeat(width));
}

function renderHeader(step, heading, meta = "") {
  const width = terminalWidth();
  const steps = [
    ["1", "구성"],
    ["2", "범위"],
    ["3", "클라이언트"],
    ["4", "API 키"],
    ["5", "설치"],
  ];
  const stepText = steps
    .map(([number, label]) => {
      if (number === String(step)) return style("1;36", `● ${number}. ${label}`);
      return color(90, `○ ${number}. ${label}`);
    })
    .join(color(90, "  /  "));
  const titleLine = `${style("1;37", APP_NAME)} ${color(90, "Public API Skills")}`;
  const metaText = meta ? color(90, meta) : "";
  const titlePadding = Math.max(1, width - visibleLength(titleLine) - visibleLength(metaText));

  writeln(divider(width));
  writeln(`${titleLine}${" ".repeat(titlePadding)}${metaText}`);
  writeln(stepText);
  writeln(divider(width));
  writeln();
  writeln(style("1;37", heading));
}

function renderLegacyHeader(step, heading, meta = "") {
  const width = terminalWidth();
  const steps = [
    ["1", "대상"],
    ["2", "스킬"],
    ["3", "API 키"],
  ];
  const stepText = steps
    .map(([number, label]) => {
      if (number === String(step)) return style("1;36", `● ${number}. ${label}`);
      return color(90, `○ ${number}. ${label}`);
    })
    .join(color(90, "  /  "));
  const titleLine = `${style("1;37", APP_NAME)} ${color(90, "Public API Skills")}`;
  const metaText = meta ? color(90, meta) : "";
  const titlePadding = Math.max(1, width - visibleLength(titleLine) - visibleLength(metaText));

  writeln(divider(width));
  writeln(`${titleLine}${" ".repeat(titlePadding)}${metaText}`);
  writeln(stepText);
  writeln(divider(width));
  writeln();
  writeln(style("1;37", heading));
}

function renderHelp(items) {
  const text = items.map(([key, label]) => `${style("1;37", key)} ${color(90, label)}`).join(color(90, "   "));
  writeln();
  writeln(text);
}

function renderOption({ active, checked = false, label, description = "", width = terminalWidth() }) {
  if (active) {
    const marker = checked ? "●" : "○";
    const descWidth = Math.max(20, Math.floor((width - visibleLength(label) - 12) * 0.78));
    const plainLine = ` › ${marker}  ${padEndVisible(label, 28)} ${truncate(description, descWidth)}`;
    writeln(style("1;30;46", padEndVisible(plainLine, width)));
    return;
  }

  const marker = checked ? color(32, "●") : color(90, "○");
  const descWidth = Math.max(20, Math.floor((width - visibleLength(label) - 12) * 0.78));
  const descText = description ? color(90, truncate(description, descWidth)) : "";
  const line = `   ${marker}  ${padEndVisible(label, 28)} ${descText}`;

  writeln(line);
}

function renderStatus(message, tone = "muted") {
  const colorCode = tone === "success" ? 32 : tone === "warn" ? 33 : 90;
  writeln(color(colorCode, message));
}

function renderSummaryBox(titleText, rows) {
  const width = terminalWidth();
  const innerWidth = width - 4;

  writeln(color(36, `╭${"─".repeat(width - 2)}╮`));
  writeln(color(36, "│ ") + padEndVisible(style("1;37", titleText), innerWidth) + color(36, " │"));
  writeln(color(36, `├${"─".repeat(width - 2)}┤`));

  for (const [label, value] of rows) {
    const prefix = color(90, `${label}:`);
    const valueWidth = Math.max(8, innerWidth - visibleLength(prefix) - 1);
    const line = `${prefix} ${truncate(String(value), valueWidth)}`;
    writeln(color(36, "│ ") + padEndVisible(line, innerWidth) + color(36, " │"));
  }

  writeln(color(36, `╰${"─".repeat(width - 2)}╯`));
}

function targetSummary(targetMode) {
  if (targetMode === "custom" && state.customDestDir) return `직접 경로: ${state.customDestDir}`;
  const labels = {
    project: "현재 프로젝트 / Codex",
    "project-claude": "현재 프로젝트 / Claude Code",
    "project-both": "현재 프로젝트 / Codex + Claude Code",
    codex: "내 계정 전역 / Codex",
    claude: "내 계정 전역 / Claude Code",
    both: "내 계정 전역 / Codex + Claude Code",
    custom: "원하는 경로",
  };
  return labels[targetMode] || "선택 전";
}

function isProjectTarget(targetMode) {
  return targetMode === "project" || targetMode === "project-claude" || targetMode === "project-both";
}

function targetFromScopeClient(scopeMode, clientMode) {
  if (scopeMode === "custom") return "custom";
  if (scopeMode === "project") {
    if (clientMode === "claude") return "project-claude";
    if (clientMode === "both") return "project-both";
    return "project";
  }
  if (clientMode === "claude") return "claude";
  if (clientMode === "both") return "both";
  return "codex";
}

function setupSummary(setupMode) {
  return setupOptions.find((option) => option.value === setupMode)?.label || "선택 전";
}

function readKey() {
  return new Promise((resolve) => {
    emitKeypressEvents(terminal.input);

    const onKeypress = (chunk, key) => {
      terminal.input.off("keypress", onKeypress);

      if (key?.ctrl && key?.name === "c") resolve("quit");
      else if (key?.name === "return" || key?.name === "enter") resolve("enter");
      else if (key?.name === "space") resolve("space");
      else if (key?.name === "a") resolve("all");
      else if (key?.name === "q" || key?.name === "escape") resolve("quit");
      else if (key?.name === "up") resolve("up");
      else if (key?.name === "down") resolve("down");
      else resolve("other");
    };

    terminal.input.once("keypress", onKeypress);
  });
}

async function withRawMode(fn) {
  if (!terminal.isTTY || typeof terminal.input.setRawMode !== "function") {
    throw new Error("대화형 터미널을 찾지 못했습니다. --claude, --codex, --both와 --all 또는 스킬 이름을 지정하세요.");
  }

  terminal.input.setRawMode(true);
  terminal.input.resume();
  hideCursor();
  try {
    return await fn();
  } finally {
    clearInteractiveFrame();
    terminal.input.setRawMode(false);
    terminal.input.pause();
    showCursor();
  }
}

async function chooseScope() {
  let cursor = 0;

  return withRawMode(async () => {
    while (true) {
      renderInteractiveFrame(() => {
        renderHeader(2, "설치 범위를 선택하세요.", `구성: ${setupSummary(state.setupMode)}`);
        writeln();

      scopeOptions.forEach((option, index) => {
        renderOption({
          active: index === cursor,
          checked: index === cursor,
          label: option.label,
          description: scopeDescription(option),
        });
      });

        renderHelp([
          ["↑/↓", "이동"],
          ["Enter", "선택"],
          ["q", "종료"],
        ]);
      });

      const key = await readKey();
      if (key === "up") cursor = cursor > 0 ? cursor - 1 : scopeOptions.length - 1;
      if (key === "down") cursor = cursor < scopeOptions.length - 1 ? cursor + 1 : 0;
      if (key === "enter") return scopeOptions[cursor].value;
      if (key === "quit") {
        clear();
        writeln("설치를 취소했습니다.");
        process.exit(0);
      }
    }
  });
}

async function chooseClient(scopeMode) {
  let cursor = scopeMode === "project" ? 0 : 2;

  return withRawMode(async () => {
    while (true) {
      renderInteractiveFrame(() => {
        renderHeader(3, "사용할 클라이언트를 선택하세요.", `범위: ${scopeOptions.find((option) => option.value === scopeMode)?.label}`);
        writeln();

      clientOptions.forEach((option, index) => {
        renderOption({
          active: index === cursor,
          checked: index === cursor,
          label: option.label,
          description: clientDescription(option),
        });
      });

        renderHelp([
          ["↑/↓", "이동"],
          ["Enter", "선택"],
          ["q", "종료"],
        ]);
      });

      const key = await readKey();
      if (key === "up") cursor = cursor > 0 ? cursor - 1 : clientOptions.length - 1;
      if (key === "down") cursor = cursor < clientOptions.length - 1 ? cursor + 1 : 0;
      if (key === "enter") return clientOptions[cursor].value;
      if (key === "quit") {
        clear();
        writeln("설치를 취소했습니다.");
        process.exit(0);
      }
    }
  });
}

async function chooseSetup() {
  let cursor = 2;

  return withRawMode(async () => {
    while (true) {
      renderInteractiveFrame(() => {
        renderHeader(1, "설치 구성을 선택하세요.", "구성 선택");
        writeln();

        setupOptions.forEach((option, index) => {
          renderOption({
            active: index === cursor,
            checked: index === cursor,
            label: option.label,
            description: option.description,
          });
        });

        renderHelp([
          ["↑/↓", "이동"],
          ["Enter", "선택"],
          ["q", "종료"],
        ]);
      });

      const key = await readKey();
      if (key === "up") cursor = cursor > 0 ? cursor - 1 : setupOptions.length - 1;
      if (key === "down") cursor = cursor < setupOptions.length - 1 ? cursor + 1 : 0;
      if (key === "enter") return setupOptions[cursor].value;
      if (key === "quit") {
        clear();
        writeln("설치를 취소했습니다.");
        process.exit(0);
      }
    }
  });
}

async function chooseSkills(skills, targetMode) {
  let cursor = 0;
  const selected = skills.map(() => false);

  return withRawMode(async () => {
    while (true) {
      renderInteractiveFrame(() => {
        const selectedCount = selected.filter(Boolean).length;
        renderHeader(2, "설치할 스킬을 선택하세요.", `대상: ${targetSummary(targetMode)}`);
        renderStatus(`선택됨 ${selectedCount} / ${skills.length}`, selectedCount > 0 ? "success" : "muted");
        writeln();

        skills.forEach((skill, index) => {
          renderOption({
            active: index === cursor,
            checked: selected[index],
            label: skill.name,
            description: skill.description,
          });
        });

        writeln();
        renderStatus(selected.every(Boolean) ? "전체 선택 상태입니다." : "필요한 스킬만 선택해 설치할 수 있습니다.");
        renderHelp([
          ["↑/↓", "이동"],
          ["Space", "선택"],
          ["a", "전체선택/해제"],
          ["Enter", "설치"],
          ["q", "종료"],
        ]);
      });

      const key = await readKey();
      if (key === "up") cursor = cursor > 0 ? cursor - 1 : skills.length - 1;
      if (key === "down") cursor = cursor < skills.length - 1 ? cursor + 1 : 0;
      if (key === "space") selected[cursor] = !selected[cursor];
      if (key === "all") {
        const next = !selected.every(Boolean);
        selected.fill(next);
      }
      if (key === "enter" && selected.some(Boolean)) {
        clear();
        return skills.filter((_, index) => selected[index]);
      }
      if (key === "quit") {
        clear();
        writeln("설치를 취소했습니다.");
        process.exit(0);
      }
    }
  });
}

function copyDirectory(source, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(source, dest, { recursive: true });
}

function installSkillToDir(skill, destDir, label) {
  const dest = path.join(destDir, skill.name);
  copyDirectory(skill.dir, dest);
  console.log(`${color(32, "●")} ${style("1;37", skill.name)} ${color(90, `(${label})`)}`);
  console.log(`  ${color(90, dest)}`);
}

function installSkill(skill, targetMode) {
  if (isProjectTarget(targetMode)) {
    installSkillToDir(skill, projectSkillsDir, "현재 프로젝트");
  }

  if (targetMode === "claude" || targetMode === "both") {
    installSkillToDir(skill, claudeDestDir, "Claude Code");
  }

  if (targetMode === "codex" || targetMode === "both") {
    installSkillToDir(skill, codexDestDir, "Codex");
  }

  if (targetMode === "custom") {
    installSkillToDir(skill, state.customDestDir, "직접 경로");
  }
}

function selectRequestedSkills(skills) {
  if (state.skillArgs.length === 0) return null;
  if (state.skillArgs.length === 1 && state.skillArgs[0] === "all") return skills;

  const byName = new Map(skills.map((skill) => [skill.name, skill]));
  byName.set("snowsign-api-operator", byName.get("snowsign-contract-operator"));
  byName.set("snowsign-public-api", byName.get("snowsign-api-reference"));
  return state.skillArgs.map((name) => {
    const skill = byName.get(name);
    if (!skill) throw new Error(`스킬을 찾지 못했습니다: ${name}`);
    return skill;
  });
}

function selectSetupSkills(skills, setupMode) {
  const option = setupOptions.find((item) => item.value === setupMode);
  if (!option) throw new Error(`알 수 없는 설치 구성입니다: ${setupMode}`);

  const byName = new Map(skills.map((skill) => [skill.name, skill]));
  return option.skills.map((name) => {
    const skill = byName.get(name);
    if (!skill) throw new Error(`스킬을 찾지 못했습니다: ${name}`);
    return skill;
  });
}

function setupIncludesMcp(setupMode) {
  return setupMode === "ops" || setupMode === "full";
}

function scopeDescription(option) {
  return setupIncludesMcp(state.setupMode) ? option.mcpDescription : option.skillDescription;
}

function clientDescription(option) {
  return setupIncludesMcp(state.setupMode) ? option.mcpDescription : option.skillDescription;
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function prepareMcpRepo() {
  if (!process.env.SNOWSIGN_MCP_DIR && path.resolve(projectRoot) === path.resolve(repoRoot)) {
    const serverFile = path.join(repoRoot, "mcp", "snowsign_mcp.mjs");
    fs.chmodSync(serverFile, 0o755);
    return serverFile;
  }

  fs.rmSync(mcpInstallDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(mcpInstallDir, "mcp"), { recursive: true });
  fs.mkdirSync(path.join(mcpInstallDir, "skills", "snowsign-api-reference", "references"), { recursive: true });
  fs.cpSync(path.join(repoRoot, "mcp", "snowsign_mcp.mjs"), path.join(mcpInstallDir, "mcp", "snowsign_mcp.mjs"));
  fs.cpSync(
    path.join(repoRoot, "skills", "snowsign-api-reference", "references", "public-api-guide.md"),
    path.join(mcpInstallDir, "skills", "snowsign-api-reference", "references", "public-api-guide.md"),
  );
  fs.chmodSync(path.join(mcpInstallDir, "mcp", "snowsign_mcp.mjs"), 0o755);
  return path.join(mcpInstallDir, "mcp", "snowsign_mcp.mjs");
}

function posixRelative(from, to) {
  return path.relative(from, to).split(path.sep).join("/");
}

function tomlString(value) {
  return JSON.stringify(value);
}

function writeManagedBlock(file, startMarker, endMarker, block) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const nextBlock = `${startMarker}\n${block.trimEnd()}\n${endMarker}`;
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `${nextBlock}\n`);
    return;
  }

  const current = fs.readFileSync(file, "utf8");
  const pattern = new RegExp(`${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (pattern.test(current)) {
    fs.writeFileSync(file, current.replace(pattern, nextBlock));
    return;
  }

  const separator = current.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(file, `${current}${separator}${nextBlock}\n`);
}

function writeCodexProjectMcp(serverFile) {
  const configFile = path.join(projectRoot, ".codex", "config.toml");
  const serverPath = posixRelative(projectRoot, serverFile);
  const block = `
[mcp_servers.snowsign]
command = "node"
args = [${tomlString(serverPath)}]
cwd = "."
env_vars = ["SNOWSIGN_API_KEY"]
`;

  writeManagedBlock(configFile, "# BEGIN SnowSign MCP", "# END SnowSign MCP", block);
  return configFile;
}

function writeClaudeProjectMcp(serverFile) {
  const configFile = path.join(projectRoot, ".mcp.json");
  const serverPath = posixRelative(projectRoot, serverFile);
  let config = {};

  if (fs.existsSync(configFile)) {
    try {
      config = JSON.parse(fs.readFileSync(configFile, "utf8"));
    } catch (error) {
      throw new Error(`${configFile} 파일이 올바른 JSON이 아닙니다: ${error.message}`);
    }
  }

  config.mcpServers = config.mcpServers && typeof config.mcpServers === "object" ? config.mcpServers : {};
  config.mcpServers.snowsign = {
    command: "node",
    args: [serverPath],
    env: {
      SNOWSIGN_API_KEY: "${SNOWSIGN_API_KEY}",
    },
  };

  fs.writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  return configFile;
}

function registerMcp(targetMode) {
  if (!setupIncludesMcp(state.setupMode)) return [];

  const serverFile = prepareMcpRepo();
  const results = [];

  if (targetMode === "project" || targetMode === "project-both") {
    results.push(["Codex MCP", writeCodexProjectMcp(serverFile)]);
  }

  if (targetMode === "project-claude" || targetMode === "project-both") {
    results.push(["Claude MCP", writeClaudeProjectMcp(serverFile)]);
  }

  if (isProjectTarget(targetMode)) {
    results.push(["MCP 서버", serverFile]);
    return results;
  }

  if (targetMode === "custom") {
    results.push(["MCP", `직접 경로 선택 시 MCP는 자동 등록하지 않습니다. 서버 파일: ${serverFile}`]);
    return results;
  }

  if (targetMode === "codex" || targetMode === "both") {
    if (commandExists("codex")) {
      const result = spawnSync("codex", ["mcp", "add", "snowsign", "--", "node", serverFile], { encoding: "utf8" });
      if (result.status === 0) results.push(["Codex MCP", "등록 완료"]);
      else results.push(["Codex MCP", `등록 실패: ${(result.stderr || result.stdout || "").trim()}`]);
    } else {
      results.push(["Codex MCP", "codex 명령어가 없어 건너뜀"]);
    }
  }

  if (targetMode === "claude" || targetMode === "both") {
    if (commandExists("claude")) {
      const result = spawnSync("claude", ["mcp", "add", "--transport", "stdio", "snowsign", "--", "node", serverFile], { encoding: "utf8" });
      if (result.status === 0) results.push(["Claude MCP", "등록 완료"]);
      else results.push(["Claude MCP", `등록 실패: ${(result.stderr || result.stdout || "").trim()}`]);
    } else {
      results.push(["Claude MCP", "claude 명령어가 없어 건너뜀"]);
    }
  }

  return results;
}

function shellRcPath() {
  const shell = process.env.SHELL || "";
  if (shell.endsWith("/zsh")) return path.join(os.homedir(), ".zshrc");
  if (shell.endsWith("/bash")) return path.join(os.homedir(), ".bashrc");
  return path.join(os.homedir(), ".profile");
}

function shellEscapeDoubleQuoted(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
}

function saveApiKey(apiKey) {
  const rcFile = shellRcPath();
  const escapedKey = shellEscapeDoubleQuoted(apiKey);
  fs.mkdirSync(path.dirname(rcFile), { recursive: true });

  if (fs.existsSync(rcFile)) {
    const current = fs.readFileSync(rcFile, "utf8");
    if (/^export SNOWSIGN_API_KEY=/m.test(current)) {
      const next = current.replace(/^export SNOWSIGN_API_KEY=.*$/m, `export SNOWSIGN_API_KEY="${escapedKey}"`);
      fs.writeFileSync(rcFile, next);
      console.log(`API 키를 ${rcFile}에 업데이트했습니다.`);
      console.log("현재 터미널에 반영하려면 새 터미널을 열거나 셸 설정 파일을 다시 불러오세요.");
      console.log(`  source ${rcFile}`);
      return;
    }
  }

  if (!fs.existsSync(rcFile)) {
    fs.writeFileSync(rcFile, "");
  }

  const current = fs.readFileSync(rcFile, "utf8");
  if (current.length > 0 && !current.endsWith("\n")) {
    fs.appendFileSync(rcFile, "\n");
  }

  if (/^# SnowSign Public API$/m.test(current)) {
    fs.appendFileSync(rcFile, `export SNOWSIGN_API_KEY="${escapedKey}"\n`);
  } else {
    fs.appendFileSync(rcFile, `\n# SnowSign Public API\nexport SNOWSIGN_API_KEY="${escapedKey}"\n`);
  }

  console.log(`API 키를 ${rcFile}에 저장했습니다.`);
  console.log("현재 터미널에 반영하려면 새 터미널을 열거나 셸 설정 파일을 다시 불러오세요.");
  console.log(`  source ${rcFile}`);
}

function askHidden(question) {
  return new Promise((resolve) => {
    let value = "";

    write(question);
    terminal.input.setRawMode(true);
    terminal.input.resume();

    const onData = (buffer) => {
      const key = buffer.toString("utf8");

      if (key === "\u0003") {
        terminal.input.off("data", onData);
        terminal.input.setRawMode(false);
        terminal.input.pause();
        writeln();
        process.exit(130);
      }

      if (key === "\r" || key === "\n") {
        terminal.input.off("data", onData);
        terminal.input.setRawMode(false);
        terminal.input.pause();
        writeln();
        resolve(value);
        return;
      }

      if (key === "\u007f") {
        value = value.slice(0, -1);
        return;
      }

      value += key;
    };

    terminal.input.on("data", onData);
  });
}

function askText(question) {
  return new Promise((resolve) => {
    let value = "";

    write(question);
    if (typeof terminal.input.setRawMode === "function") {
      terminal.input.setRawMode(true);
    }
    terminal.input.resume();

    const onData = (buffer) => {
      const keys = Array.from(buffer.toString("utf8"));

      for (const key of keys) {
        if (key === "\u0003") {
          terminal.input.off("data", onData);
          if (typeof terminal.input.setRawMode === "function") terminal.input.setRawMode(false);
          terminal.input.pause();
          writeln();
          process.exit(130);
        }

        if (key === "\r" || key === "\n") {
          terminal.input.off("data", onData);
          if (typeof terminal.input.setRawMode === "function") terminal.input.setRawMode(false);
          terminal.input.pause();
          writeln();
          resolve(value);
          return;
        }

        if (key === "\u007f") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            write("\b \b");
          }
          continue;
        }

        value += key;
        write(key);
      }
    };

    terminal.input.on("data", onData);
  });
}

async function promptCustomDestDir() {
  if (state.targetMode !== "custom" || state.customDestDir) return;

  if (!terminal.isTTY) {
    throw new Error("--target=custom을 사용할 때는 --dest=<경로>를 함께 지정하세요.");
  }

  console.log();
  renderHeader(2, "스킬 설치 경로를 입력하세요.", "직접 경로");

  while (true) {
    const answer = (await askText("설치 경로: ")).trim();
    if (answer) {
      state.customDestDir = path.resolve(answer.replace(/^~(?=$|\/|\\)/, os.homedir()));
      return;
    }

    renderStatus("설치 경로는 비워둘 수 없습니다.", "warn");
  }
}

async function promptApiKey() {
  if (!setupIncludesMcp(state.setupMode)) return;

  console.log();
  renderHeader(4, "SnowSign API 키를 입력하세요.", "필수");

  if (process.env.SNOWSIGN_API_KEY) {
    renderStatus("SNOWSIGN_API_KEY 환경변수가 이미 설정되어 있습니다.", "success");
    return;
  }

  if (!terminal.isTTY || typeof terminal.input.setRawMode !== "function") {
    renderStatus("SnowSign API 키가 필요합니다. 조직관리 > API 키 > 새 API에서 키를 발급한 뒤 다시 실행하세요.", "warn");
    console.log(`  ${style("1;37", 'export SNOWSIGN_API_KEY="your_api_key"')}`);
    throw new Error("SNOWSIGN_API_KEY가 설정되지 않았습니다.");
  }

  renderStatus("스노우싸인 웹 콘솔에서 조직관리 > API 키 > 새 API로 이동해 키를 발급하세요.");
  renderStatus("입력한 API 키는 화면에 표시되지 않습니다.");

  while (true) {
    const apiKey = await askHidden("SnowSign API 키: ");
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
      return;
    }

    renderStatus("API 키는 비워둘 수 없습니다. 발급한 키를 입력하세요.", "warn");
  }
}

function printFooter(targetMode, mcpRows = []) {
  console.log();
  const rows = [
    ["설치 구성", setupSummary(state.setupMode)],
    ["설치 범위", targetSummary(targetMode)],
  ];

  if (targetMode === "claude" || targetMode === "both") {
    rows.push(["Claude Code", claudeDestDir]);
  }

  if (targetMode === "codex" || targetMode === "both") {
    rows.push(["Codex", codexDestDir]);
  }

  if (targetMode === "custom") {
    rows.push(["스킬 경로", state.customDestDir]);
  }

  if (isProjectTarget(targetMode) && !setupIncludesMcp(state.setupMode)) {
    rows.push(["프로젝트 스킬", projectSkillsDir]);
  }

  rows.push(...mcpRows);

  renderSummaryBox("설치가 완료되었습니다.", rows);
}

async function main() {
  parseArgs(process.argv.slice(2));

  const skills = loadSkills();
  state.setupMode = state.setupMode === "ask" ? await chooseSetup() : state.setupMode;
  if (state.targetMode === "ask") {
    state.scopeMode = state.scopeMode === "ask" ? await chooseScope() : state.scopeMode;
    if (state.scopeMode !== "custom") {
      state.clientMode = state.clientMode === "ask" ? await chooseClient(state.scopeMode) : state.clientMode;
    }
    state.targetMode = targetFromScopeClient(state.scopeMode, state.clientMode);
  }
  const targetMode = state.targetMode;
  state.targetMode = targetMode;
  await promptCustomDestDir();

  const requestedSkills = selectRequestedSkills(skills);
  const selectedSkills = requestedSkills || selectSetupSkills(skills, state.setupMode);

  await promptApiKey();

  if (terminal.isTTY) {
    renderHeader(5, "선택한 구성을 설치합니다.", `범위: ${targetSummary(targetMode)}`);
  }

  const mcpRows = registerMcp(targetMode);

  for (const skill of selectedSkills) {
    installSkill(skill, targetMode);
  }

  printFooter(targetMode, mcpRows);
}

main().catch((error) => {
  console.error(`오류: ${error.message}`);
  process.exit(1);
});
