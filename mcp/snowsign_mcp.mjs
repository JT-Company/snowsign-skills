#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "snowsign";
const SERVER_VERSION = "0.2.0";
const DEFAULT_BASE_URL = "https://api-snowsign.jtsnowball.com/public/v1";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiGuidePath = path.join(repoRoot, "skills", "snowsign-api-reference", "references", "public-api-guide.md");

if (typeof fetch !== "function") {
  throw new Error("SnowSign MCP 서버는 Node.js 18 이상이 필요합니다.");
}

function baseUrl() {
  return (process.env.SNOWSIGN_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function apiKey() {
  const key = (process.env.SNOWSIGN_API_KEY || "").trim();
  if (!key) {
    throw new Error("SNOWSIGN_API_KEY가 필요합니다. 스노우싸인 웹 콘솔의 조직관리 > API 키 > 새 API에서 발급하세요.");
  }
  return key;
}

function textContent(text) {
  return { content: [{ type: "text", text }] };
}

function jsonText(data) {
  return textContent(JSON.stringify(data, null, 2));
}

function queryString(params = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }

  const value = search.toString();
  return value ? `?${value}` : "";
}

async function apiRequest(method, apiPath, { query, body, outputPath } = {}) {
  const url = `${baseUrl()}${apiPath}${queryString(query)}`;
  const headers = {
    "X-API-Key": apiKey(),
    Accept: "application/json, application/pdf, application/octet-stream",
  };

  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    let payload;
    try {
      payload = JSON.parse(buffer.toString("utf8"));
    } catch {
      payload = buffer.toString("utf8");
    }
    throw new Error(JSON.stringify({ status: response.status, error: payload }));
  }

  const rawText = buffer.toString("utf8");
  if (contentType.includes("application/json") || rawText.startsWith("{") || rawText.startsWith("[")) {
    return JSON.parse(rawText);
  }

  if (outputPath) {
    const target = path.resolve(outputPath.replace(/^~(?=$|\/|\\)/, os.homedir()));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    return {
      success: true,
      status: response.status,
      content_type: contentType,
      path: target,
      bytes: buffer.length,
    };
  }

  return {
    success: true,
    status: response.status,
    content_type: contentType,
    bytes: buffer.length,
    base64: buffer.toString("base64"),
  };
}

function listReferenceSections() {
  const guide = fs.readFileSync(apiGuidePath, "utf8");
  return guide
    .split(/\r?\n/)
    .filter((line) => line.startsWith("## ") || line.startsWith("### "))
    .map((line) => line.replace(/^#+\s*/, "").trim());
}

function referenceSection(title) {
  const guide = fs.readFileSync(apiGuidePath, "utf8");
  const lines = guide.split(/\r?\n/);
  let start = -1;
  let startLevel = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("## ") && !line.startsWith("### ")) continue;

    const heading = line.replace(/^#+\s*/, "").trim();
    if (heading === title) {
      start = index;
      startLevel = line.match(/^#+/)?.[0].length || 0;
      break;
    }
  }

  if (start === -1) {
    throw new Error(`섹션을 찾지 못했습니다: ${title}. 사용 가능: ${listReferenceSections().join(", ")}`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("#")) continue;
    const level = line.match(/^#+/)?.[0].length || 0;
    if (level <= startLevel) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join("\n").trim();
}

function objectSchema(properties, required) {
  const schema = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  if (required?.length) schema.required = required;
  return schema;
}

const TOOLS = [
  {
    name: "snowsign_list_contracts",
    description: "SnowSign 계약 목록을 조회합니다.",
    inputSchema: objectSchema({
      page: { type: "integer", description: "페이지 번호입니다." },
      per_page: { type: "integer", description: "페이지당 항목 수입니다." },
      status: { type: "string", description: "draft, pending, in_progress, completed, cancelled, expired, rejected 중 하나입니다." },
    }),
  },
  {
    name: "snowsign_create_contract",
    description: "SnowSign 계약 초안을 생성합니다.",
    inputSchema: objectSchema({
      contract: { type: "object", description: "POST /v1/contracts 요청 본문입니다." },
    }, ["contract"]),
  },
  {
    name: "snowsign_get_contract",
    description: "SnowSign 계약 상세 정보를 조회합니다.",
    inputSchema: objectSchema({
      contract_id: { type: "string", description: "계약 ID입니다." },
    }, ["contract_id"]),
  },
  {
    name: "snowsign_get_contract_status",
    description: "SnowSign 계약 상태를 조회합니다.",
    inputSchema: objectSchema({
      contract_id: { type: "string", description: "계약 ID입니다." },
    }, ["contract_id"]),
  },
  {
    name: "snowsign_send_contract",
    description: "SnowSign 계약을 참여자에게 발송합니다.",
    inputSchema: objectSchema({
      contract_id: { type: "string", description: "계약 ID입니다." },
      message: { type: "string", description: "발송 메시지입니다." },
    }, ["contract_id"]),
  },
  {
    name: "snowsign_cancel_contract",
    description: "SnowSign 계약을 취소합니다.",
    inputSchema: objectSchema({
      contract_id: { type: "string", description: "계약 ID입니다." },
      reason: { type: "string", description: "취소 사유입니다." },
    }, ["contract_id"]),
  },
  {
    name: "snowsign_remind_contract",
    description: "SnowSign 계약 참여자에게 리마인더를 보냅니다.",
    inputSchema: objectSchema({
      contract_id: { type: "string", description: "계약 ID입니다." },
      message: { type: "string", description: "리마인더 메시지입니다." },
    }, ["contract_id"]),
  },
  {
    name: "snowsign_download_contract",
    description: "완료된 SnowSign 계약 PDF를 다운로드합니다.",
    inputSchema: objectSchema({
      contract_id: { type: "string", description: "계약 ID입니다." },
      output_path: { type: "string", description: "파일로 저장할 경로입니다. 생략하면 base64로 반환합니다." },
    }, ["contract_id"]),
  },
  {
    name: "snowsign_download_audit_certificate",
    description: "SnowSign 감사추적인증서를 다운로드합니다.",
    inputSchema: objectSchema({
      contract_id: { type: "string", description: "계약 ID입니다." },
      output_path: { type: "string", description: "파일로 저장할 경로입니다. 생략하면 base64로 반환합니다." },
    }, ["contract_id"]),
  },
  {
    name: "snowsign_bulk_download_contracts",
    description: "여러 SnowSign 계약 PDF 일괄 다운로드 링크를 생성합니다.",
    inputSchema: objectSchema({
      contract_ids: { type: "array", items: { type: "string" }, description: "계약 ID 목록입니다." },
    }, ["contract_ids"]),
  },
  {
    name: "snowsign_bulk_download_audit_certificates",
    description: "여러 SnowSign 감사추적인증서 일괄 다운로드 링크를 생성합니다.",
    inputSchema: objectSchema({
      contract_ids: { type: "array", items: { type: "string" }, description: "계약 ID 목록입니다." },
    }, ["contract_ids"]),
  },
  {
    name: "snowsign_list_templates",
    description: "SnowSign 템플릿 목록을 조회합니다.",
    inputSchema: objectSchema({
      page: { type: "integer", description: "페이지 번호입니다." },
      per_page: { type: "integer", description: "페이지당 항목 수입니다." },
    }),
  },
  {
    name: "snowsign_get_template",
    description: "SnowSign 템플릿 상세 정보를 조회합니다.",
    inputSchema: objectSchema({
      template_id: { type: "string", description: "템플릿 ID입니다." },
    }, ["template_id"]),
  },
  {
    name: "snowsign_download_template",
    description: "SnowSign 템플릿 원본 파일을 다운로드합니다.",
    inputSchema: objectSchema({
      template_id: { type: "string", description: "템플릿 ID입니다." },
      output_path: { type: "string", description: "파일로 저장할 경로입니다. 생략하면 base64로 반환합니다." },
    }, ["template_id"]),
  },
  {
    name: "snowsign_create_contract_from_template",
    description: "SnowSign 템플릿으로 계약 초안을 생성합니다.",
    inputSchema: objectSchema({
      template_id: { type: "string", description: "템플릿 ID입니다." },
      contract: { type: "object", description: "POST /v1/templates/{id}/create-contract 요청 본문입니다." },
    }, ["template_id", "contract"]),
  },
  {
    name: "snowsign_list_api_reference_sections",
    description: "SnowSign API 참조 문서의 섹션 목록을 보여줍니다.",
    inputSchema: objectSchema({}),
  },
  {
    name: "snowsign_get_api_reference_section",
    description: "SnowSign API 참조 문서의 특정 섹션을 반환합니다.",
    inputSchema: objectSchema({
      title: { type: "string", description: "섹션 제목입니다. 예: 계약서 생성, 템플릿으로 계약서 생성, 에러 처리" },
    }, ["title"]),
  },
];

const PROMPTS = [
  {
    name: "snowsign_contract_operator",
    description: "SnowSign 계약 조회, 생성, 발송, 취소, 리마인더, 다운로드를 수행합니다.",
    arguments: [],
  },
  {
    name: "snowsign_api_reference",
    description: "SnowSign Public API 연동 구현과 요청/응답 스키마 확인을 돕습니다.",
    arguments: [],
  },
];

async function callTool(name, args) {
  if (name === "snowsign_list_contracts") return jsonText(await apiRequest("GET", "/contracts", { query: args }));
  if (name === "snowsign_create_contract") return jsonText(await apiRequest("POST", "/contracts", { body: args.contract }));
  if (name === "snowsign_get_contract") return jsonText(await apiRequest("GET", `/contracts/${encodeURIComponent(args.contract_id)}`));
  if (name === "snowsign_get_contract_status") return jsonText(await apiRequest("GET", `/contracts/${encodeURIComponent(args.contract_id)}/status`));
  if (name === "snowsign_send_contract") {
    const body = args.message ? { message: args.message } : {};
    return jsonText(await apiRequest("POST", `/contracts/${encodeURIComponent(args.contract_id)}/send`, { body }));
  }
  if (name === "snowsign_cancel_contract") {
    const body = args.reason ? { reason: args.reason } : {};
    return jsonText(await apiRequest("POST", `/contracts/${encodeURIComponent(args.contract_id)}/cancel`, { body }));
  }
  if (name === "snowsign_remind_contract") {
    const body = args.message ? { message: args.message } : {};
    return jsonText(await apiRequest("POST", `/contracts/${encodeURIComponent(args.contract_id)}/remind`, { body }));
  }
  if (name === "snowsign_download_contract") {
    return jsonText(await apiRequest("GET", `/contracts/${encodeURIComponent(args.contract_id)}/download`, { outputPath: args.output_path }));
  }
  if (name === "snowsign_download_audit_certificate") {
    return jsonText(await apiRequest("GET", `/contracts/${encodeURIComponent(args.contract_id)}/audit-certificate`, { outputPath: args.output_path }));
  }
  if (name === "snowsign_bulk_download_contracts") {
    return jsonText(await apiRequest("POST", "/contracts/bulk-download", { body: { contract_ids: args.contract_ids } }));
  }
  if (name === "snowsign_bulk_download_audit_certificates") {
    return jsonText(await apiRequest("POST", "/contracts/bulk-audit-certificates", { body: { contract_ids: args.contract_ids } }));
  }
  if (name === "snowsign_list_templates") return jsonText(await apiRequest("GET", "/templates", { query: args }));
  if (name === "snowsign_get_template") return jsonText(await apiRequest("GET", `/templates/${encodeURIComponent(args.template_id)}`));
  if (name === "snowsign_download_template") {
    return jsonText(await apiRequest("GET", `/templates/${encodeURIComponent(args.template_id)}/download`, { outputPath: args.output_path }));
  }
  if (name === "snowsign_create_contract_from_template") {
    return jsonText(await apiRequest("POST", `/templates/${encodeURIComponent(args.template_id)}/create-contract`, { body: args.contract }));
  }
  if (name === "snowsign_list_api_reference_sections") return jsonText({ sections: listReferenceSections() });
  if (name === "snowsign_get_api_reference_section") return textContent(referenceSection(args.title));
  throw new Error(`알 수 없는 tool입니다: ${name}`);
}

async function handle(method, params = {}) {
  if (method === "initialize") {
    return {
      protocolVersion: params.protocolVersion || "2025-06-18",
      capabilities: {
        tools: {},
        prompts: {},
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    };
  }

  if (method === "tools/list") return { tools: TOOLS };
  if (method === "tools/call") return callTool(params.name || "", params.arguments || {});
  if (method === "prompts/list") return { prompts: PROMPTS };

  if (method === "prompts/get") {
    if (params.name === "snowsign_contract_operator") {
      return {
        description: "SnowSign 계약 운영",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: "SnowSign MCP 도구로 계약 조회, 생성, 발송, 취소, 리마인더, 다운로드를 수행하세요. 상태 변경 작업은 실행 전 사용자 확인을 받으세요.",
          },
        }],
      };
    }

    if (params.name === "snowsign_api_reference") {
      return {
        description: "SnowSign API 참조",
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: "snowsign_get_api_reference_section 도구로 필요한 API 섹션을 확인한 뒤 SnowSign Public API 연동 코드를 작성하세요.",
          },
        }],
      };
    }

    throw new Error(`알 수 없는 prompt입니다: ${params.name}`);
  }

  if (method.startsWith("notifications/")) return null;
  throw new Error(`지원하지 않는 method입니다: ${method}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", async (line) => {
  if (!line.trim()) return;

  let request = {};
  try {
    request = JSON.parse(line);
    if (!("id" in request)) {
      await handle(request.method || "", request.params || {});
      return;
    }

    const result = await handle(request.method || "", request.params || {});
    if (result === null) return;
    send({ jsonrpc: "2.0", id: request.id, result });
  } catch (error) {
    if ("id" in request) {
      send({
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32000,
          message: error.message,
        },
      });
    }
  }
});
