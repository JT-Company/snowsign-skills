#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "snowsign";
const SERVER_VERSION = "0.3.0";
const DEFAULT_BASE_URL = "https://api-snowsign.jtsnowball.com/public/v1";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiGuidePath = path.join(repoRoot, "skills", "snowsign-integration-architect", "references", "public-api-guide.md");

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

function resolvePath(filePath) {
  return path.resolve(filePath.replace(/^~(?=$|\/|\\)/, os.homedir()));
}

async function uploadPdfFile({ file_path, purpose, filename, content_type }) {
  const target = resolvePath(file_path);
  const stat = fs.statSync(target);
  if (!stat.isFile()) {
    throw new Error(`PDF 파일이 아닙니다: ${target}`);
  }

  const uploadSession = await apiRequest("POST", "/uploads", {
    body: {
      purpose,
      filename: filename || path.basename(target),
      content_type: content_type || "application/pdf",
      size_bytes: stat.size,
    },
  });

  const upload = uploadSession.data || uploadSession;
  if (!upload.upload_id || !upload.upload_url || !upload.fields) {
    throw new Error(`업로드 세션 응답 형식이 올바르지 않습니다: ${JSON.stringify(uploadSession)}`);
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(upload.fields)) {
    form.append(key, String(value));
  }

  const bytes = fs.readFileSync(target);
  const blob = new Blob([bytes], { type: content_type || "application/pdf" });
  form.append("file", blob, filename || path.basename(target));

  const response = await fetch(upload.upload_url, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(JSON.stringify({ status: response.status, error: errorText }));
  }

  return {
    success: true,
    upload_id: upload.upload_id,
    purpose,
    filename: filename || path.basename(target),
    size_bytes: stat.size,
    expires_at: upload.expires_at,
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
    name: "snowsign_create_upload_session",
    description: "SnowSign PDF 업로드 세션을 생성합니다. 반환된 upload_id를 PDF 계약/템플릿 생성 요청의 document_upload_id로 사용합니다.",
    inputSchema: objectSchema({
      purpose: { type: "string", description: "contract_document 또는 template_document 중 하나입니다." },
      filename: { type: "string", description: "원본 PDF 파일명입니다." },
      content_type: { type: "string", description: "application/pdf를 사용합니다." },
      size_bytes: { type: "integer", description: "업로드 예정 파일 크기입니다. 최대 50MB입니다." },
    }, ["purpose", "filename", "content_type", "size_bytes"]),
  },
  {
    name: "snowsign_upload_pdf",
    description: "로컬 PDF 파일로 업로드 세션을 만들고 presigned POST 업로드까지 수행합니다. 반환된 upload_id를 PDF 계약/템플릿 생성에 사용하세요.",
    inputSchema: objectSchema({
      file_path: { type: "string", description: "업로드할 로컬 PDF 경로입니다." },
      purpose: { type: "string", description: "contract_document 또는 template_document 중 하나입니다." },
      filename: { type: "string", description: "SnowSign에 저장할 원본 파일명입니다. 생략하면 로컬 파일명을 사용합니다." },
      content_type: { type: "string", description: "기본값은 application/pdf입니다." },
    }, ["file_path", "purpose"]),
  },
  {
    name: "snowsign_run_upload_diagnostics",
    description: "업로드된 PDF의 사전 진단 결과를 조회합니다. 계약/템플릿 생성 전 사용자에게 PDF 경고를 보여줄 때 사용합니다.",
    inputSchema: objectSchema({
      upload_id: { type: "string", description: "업로드 세션 ID입니다." },
    }, ["upload_id"]),
  },
  {
    name: "snowsign_create_contract_from_pdf",
    description: "업로드 PDF와 필드 위치 정보로 SnowSign 계약서를 생성합니다. send_immediately=true이면 생성 후 즉시 발송됩니다.",
    inputSchema: objectSchema({
      contract: { type: "object", description: "POST /v1/contracts 요청 본문입니다. document_upload_id, participants, signature_fields를 포함합니다." },
    }, ["contract"]),
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
      participant_uuids: { type: "array", items: { type: "string" }, description: "특정 참여자에게만 보낼 참여자 UUID 목록입니다. 생략하면 전체 미서명 참여자에게 보냅니다." },
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
    description: "SnowSign 템플릿 상세 정보를 조회합니다. 응답의 signers[].security_method는 email, password, easy_cert 중 하나인 역할별 보안 정책입니다.",
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
    name: "snowsign_create_template_from_pdf",
    description: "업로드 PDF와 역할/필드 위치 정보로 SnowSign 템플릿을 생성합니다.",
    inputSchema: objectSchema({
      template: { type: "object", description: "POST /v1/templates 요청 본문입니다. document_upload_id, signers, signature_fields를 포함합니다." },
    }, ["template"]),
  },
  {
    name: "snowsign_create_contract_from_template",
    description: "SnowSign 템플릿으로 계약 초안을 생성합니다. 먼저 snowsign_get_template으로 signers[].security_method를 확인하세요. password 역할은 participants[].security={method:'password', value:'...'}가 필요하고, easy_cert 역할은 phone만 전달하며 security를 전달하지 않습니다.",
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
      title: { type: "string", description: "섹션 제목입니다. 예: 템플릿으로 계약서 생성, 에러 처리" },
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
  if (name === "snowsign_get_contract") return jsonText(await apiRequest("GET", `/contracts/${encodeURIComponent(args.contract_id)}`));
  if (name === "snowsign_get_contract_status") return jsonText(await apiRequest("GET", `/contracts/${encodeURIComponent(args.contract_id)}/status`));
  if (name === "snowsign_create_upload_session") {
    return jsonText(await apiRequest("POST", "/uploads", {
      body: {
        purpose: args.purpose,
        filename: args.filename,
        content_type: args.content_type,
        size_bytes: args.size_bytes,
      },
    }));
  }
  if (name === "snowsign_upload_pdf") return jsonText(await uploadPdfFile(args));
  if (name === "snowsign_run_upload_diagnostics") {
    return jsonText(await apiRequest("POST", `/uploads/${encodeURIComponent(args.upload_id)}/diagnostics`));
  }
  if (name === "snowsign_create_contract_from_pdf") {
    return jsonText(await apiRequest("POST", "/contracts", { body: args.contract }));
  }
  if (name === "snowsign_send_contract") {
    const body = args.message ? { message: args.message } : {};
    return jsonText(await apiRequest("POST", `/contracts/${encodeURIComponent(args.contract_id)}/send`, { body }));
  }
  if (name === "snowsign_cancel_contract") {
    const body = args.reason ? { reason: args.reason } : {};
    return jsonText(await apiRequest("POST", `/contracts/${encodeURIComponent(args.contract_id)}/cancel`, { body }));
  }
  if (name === "snowsign_remind_contract") {
    const body = {};
    if (args.message) body.message = args.message;
    if (args.participant_uuids) body.participant_uuids = args.participant_uuids;
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
  if (name === "snowsign_create_template_from_pdf") {
    return jsonText(await apiRequest("POST", "/templates", { body: args.template }));
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
            text: "SnowSign MCP 도구로 계약 조회, 템플릿/PDF 기반 생성, 발송, 취소, 리마인더, 다운로드를 수행하세요. 상태 변경 작업과 send_immediately=true 계약 생성은 실행 전 사용자 확인을 받으세요. PDF 기반 생성은 snowsign_upload_pdf 또는 snowsign_create_upload_session으로 document_upload_id를 준비한 뒤 snowsign_create_contract_from_pdf를 사용하세요. 템플릿으로 계약을 생성할 때는 먼저 템플릿 상세의 signers[].security_method를 확인하고, password 역할에만 participants[].security 비밀번호 값을 전달하며 easy_cert 역할에는 phone만 전달하세요.",
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
            text: "snowsign_get_api_reference_section 도구로 필요한 API 섹션을 확인한 뒤 SnowSign Public API 연동 코드를 작성하세요. 외부 PDF 연동은 POST /v1/uploads로 upload_id를 만들고 PDF를 업로드한 뒤 POST /v1/contracts 또는 POST /v1/templates의 document_upload_id로 전달합니다. 템플릿 기반 계약 생성 플로우에서는 GET /v1/templates/{id} 응답의 signers[].security_method가 보안 정책의 기준입니다.",
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
