# 스노우싸인 Hosted Embed 개발 가이드

## 목차

- [개요](#개요)
- [전체 흐름](#전체-흐름)
- [사전 준비](#사전-준비)
- [1. 서버에서 Embed Session 생성](#1-서버에서-embed-session-생성)
- [2. 브라우저에서 iframe 표시](#2-브라우저에서-iframe-표시)
- [3. 결과 이벤트 수신](#3-결과-이벤트-수신)
- [flows 선택](#flows-선택)
- [보안 체크리스트](#보안-체크리스트)
- [오류 처리](#오류-처리)
- [샘플 구현](#샘플-구현)
- [문제 해결](#문제-해결)

---

## 개요

Hosted Embed는 외부 ERP, 그룹웨어, 백오피스 화면 안에서 스노우싸인의 계약 생성 화면을 iframe으로 제공하는 방식입니다.

외부 서비스는 스노우싸인 API Key를 서버에만 보관하고, 브라우저에는 스노우싸인이 발급한 `iframe_url`만 전달합니다. iframe 안에서는 스노우싸인이 PDF 업로드, AI 문서 작성, PDF 렌더링, 필드 배치, 참여자 입력, 템플릿 선택, 대량 발송 UI를 처리합니다.

외부 서비스가 직접 구현할 부분은 세 가지입니다.

1. 서버에서 Embed Session 생성
2. 브라우저에서 `iframe_url`을 iframe으로 표시
3. iframe이 보내는 `postMessage` 결과 처리

외부 서비스가 직접 구현하지 않는 것:

- PDF 업로드 처리
- AI HTML 문서 작성, 미리보기 기반 페이지 구조 검토, 렌더링 처리
- 계약 생성/발송 처리
- 템플릿 조회 처리
- 스노우싸인 iframe 초기화와 인증 처리

---

## 전체 흐름

```text
외부 브라우저
  -> 외부 서버에 "계약 생성 iframe 열기" 요청

외부 서버
  -> 스노우싸인 Public API에 POST /v1/embed-sessions 호출
  -> 응답의 iframe_url을 외부 브라우저에 반환

외부 브라우저
  -> iframe src=iframe_url 로 스노우싸인 화면 표시
  -> postMessage로 ready/completed/error 이벤트 수신

스노우싸인 iframe
  -> PDF 업로드 또는 AI 문서 작성/렌더링
  -> 계약 생성/발송, 결과 전달을 처리
```

---

## 사전 준비

### API Key 발급

1. 스노우싸인 웹 콘솔 → **조직 설정** → **API 키**
2. **새 API 키** 생성
3. 발급된 API Key를 외부 서버의 환경변수 또는 Secret Manager에 저장

API Key는 브라우저 JavaScript, HTML, iframe URL, 로그에 노출하지 마세요.

### Origin 확인

Embed Session 생성 시 `allowed_origins`에 iframe을 띄우는 외부 서비스의 origin을 넣어야 합니다.

예:

| 외부 서비스 URL | allowed origin |
|----------------|----------------|
| `https://erp.example.com/contracts/1004` | `https://erp.example.com` |
| `https://admin.example.com:8443/workflows` | `https://admin.example.com:8443` |
| `http://localhost:5173/contracts` | `http://localhost:5173` |

`allowed_origins`에는 path, query, fragment를 포함하지 않습니다.

---

## 1. 서버에서 Embed Session 생성

외부 서버에서 스노우싸인 Public API를 호출합니다.

```http
POST https://api-snowsign.jtsnowball.com/public/v1/embed-sessions
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

### 요청 예시

```json
{
  "purpose": "contract_create",
  "allowed_origins": ["https://erp.example.com"],
  "flows": ["template_bulk"],
  "external_system": "customer-erp",
  "external_id": "ERP-2026-00123",
  "reference_id": "order-1004"
}
```

### 주요 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `allowed_origins` | Y | iframe을 표시할 parent origin 목록 |
| `flows` | Y | iframe에서 허용할 계약 생성 흐름 |
| `external_system` | N | 외부 시스템명 |
| `external_id` | N | 외부 업무/문서 ID |
| `reference_id` | N | 외부 서비스에서 재조회할 참조 ID. 중복 세션 방지에도 사용 |

`external_system`과 `external_id`를 함께 보내면 같은 외부 요청의 iframe 세션이 중복 생성되지 않습니다. 두 값을 쓰지 않는 경우에는 `reference_id`가 같은 역할을 합니다.

같은 업무 화면을 하나만 열게 하려면 업무 ID를 그대로 사용하세요. 새로고침이나 재시도마다 새 iframe을 열 수 있어야 한다면 `external_id`는 매번 새로 만들고, 원래 주문/문서 ID는 `reference_id`에 넣는 방식을 권장합니다.

### 응답 예시

```json
{
  "success": true,
  "data": {
    "session_id": "embed-session-uuid",
    "iframe_url": "https://app.snowsign.jtsnowball.com/embed/contracts/new?...",
    "code_expires_at": "2026-06-27T12:00:00Z"
  }
}
```

응답 필드 중 브라우저에는 `iframe_url`만 전달하세요. iframe URL을 외부 브라우저 코드에서 파싱하거나 장기간 저장하지 않습니다.

---

## 2. 브라우저에서 iframe 표시

외부 서버에서 받은 `iframe_url`을 iframe의 `src`로 사용합니다.

```html
<iframe
  id="snowsign-embed"
  src="https://app.snowsign.jtsnowball.com/embed/contracts/new?..."
  style="width: 100%; height: 720px; border: 0;"
  allow="clipboard-write"
></iframe>
```

권장 UI:

- 최소 높이 720px 이상
- 모바일에서는 전체 화면 modal 또는 별도 화면 권장
- iframe이 실패 이벤트를 보내면 외부 화면에서 재시도 버튼 제공
- 세션 만료 시 외부 서버에서 새 Embed Session을 다시 발급

---

## 3. 결과 이벤트 수신

스노우싸인 iframe은 parent window로 `postMessage` 이벤트를 보냅니다.

### 이벤트 종류

| 이벤트 | 설명 |
|--------|------|
| `snowsign.embed.ready` | iframe 초기화 완료 |
| `snowsign.embed.contract_created` | 계약 초안 생성 완료 |
| `snowsign.embed.contract_sent` | 계약 발송 완료 |
| `snowsign.embed.completed` | 템플릿 단건/대량 처리 완료 |
| `snowsign.embed.cancelled` | 사용자가 취소 |
| `snowsign.embed.error` | 세션 만료, 권한, 쿼터, 구독 등 오류 |

### 수신 코드 예시

```js
const SNOWSIGN_APP_ORIGIN = 'https://app.snowsign.jtsnowball.com';

window.addEventListener('message', (event) => {
  if (event.origin !== SNOWSIGN_APP_ORIGIN) return;

  const message = event.data;
  if (!message || message.source !== 'snowsign.embed') return;

  switch (message.type) {
    case 'snowsign.embed.ready':
      console.log('스노우싸인 iframe ready', message.payload);
      break;

    case 'snowsign.embed.contract_created':
    case 'snowsign.embed.contract_sent':
    case 'snowsign.embed.completed':
      console.log('스노우싸인 completed', message.payload);
      // 외부 업무 상태를 "계약 생성 완료" 또는 "발송 완료"로 갱신합니다.
      break;

    case 'snowsign.embed.cancelled':
      console.log('스노우싸인 cancelled', message.payload);
      break;

    case 'snowsign.embed.error':
      console.error('스노우싸인 error', message.payload);
      // 세션 만료면 새 iframe_url을 발급받아 재시도합니다.
      break;
  }
});
```

### 완료 payload 예시

```json
{
  "source": "snowsign.embed",
  "type": "snowsign.embed.contract_sent",
  "payload": {
    "contract_id": "contract-uuid",
    "title": "근로계약서",
    "status": "pending",
    "sent_at": "2026-06-12T12:10:00Z"
  }
}
```

대량 발송은 `snowsign.embed.completed`로 전달되며, payload에는 처리 건수와 실패 정보가 포함될 수 있습니다.

---

## flows 선택

`flows`는 iframe에서 사용자가 할 수 있는 일을 제한합니다.

- PDF 초안: `pdf_draft`
- PDF 즉시 발송: `pdf_send`
- 템플릿 초안: `template_draft`
- 템플릿 즉시 발송: `template_send`
- 템플릿 대량 발송: `template_bulk`
- AI 문서 초안: `ai_draft`
- AI 문서 즉시 발송: `ai_send`
- 전체: `all`

전체 흐름을 허용하려면 `flows: ["all"]`만 전달합니다.

### 결재

iframe에서는 모든 멤버가 사용할 수 있는 템플릿만 표시합니다. 또한 결재가 설정되어 있으면 즉시 발송하지 않고 오류를 반환합니다.

---

## 보안 체크리스트

- API Key는 외부 서버에만 저장합니다.
- API Key를 브라우저 JavaScript, HTML, 모바일 앱, 로그에 노출하지 않습니다.
- 브라우저에는 `iframe_url`만 전달합니다.
- `allowed_origins`는 실제 iframe을 표시하는 origin만 넣습니다.
- `allowed_origins`에 `*`, path, query, fragment를 넣지 않습니다.
- `postMessage` 수신 시 반드시 `event.origin`과 `message.source`를 검증합니다.
- `iframe_url`은 단기 세션 URL이므로 장기간 저장하거나 공유하지 않습니다.
- 세션 만료 또는 오류 발생 시 기존 iframe URL을 재사용하지 말고 새 세션을 발급합니다.

---

## 오류 처리

iframe 오류는 `snowsign.embed.error` 이벤트로 전달됩니다.

권장 처리:

| 상황 | 외부 서비스 처리 |
|------|----------------|
| 세션 만료 | 새 Embed Session을 발급해 iframe 재로딩 |
| 권한 오류 | 서버에서 flows와 API Key 상태 확인 |
| origin 오류 | `allowed_origins`가 실제 parent origin과 일치하는지 확인 |
| 구독/쿼터 오류 | 스노우싸인 관리자에게 플랜/사용량 확인 안내 |
| 사용자가 취소 | 외부 화면을 닫거나 이전 단계로 이동 |

iframe 안에서는 결제/플랜/초과 사용 설정을 변경하지 않습니다. 해당 처리는 외부 서비스 관리자 안내 또는 스노우싸인 관리자 화면에서 진행합니다.

---

## 샘플 구현

### Node.js / Express

```js
import express from 'express';

const app = express();
app.use(express.json());

const SNOWSIGN_PUBLIC_API = 'https://api-snowsign.jtsnowball.com/public/v1';
const SNOWSIGN_API_KEY = process.env.SNOWSIGN_API_KEY;

app.post('/api/snowsign/embed-session', async (req, res) => {
  const { externalId } = req.body;

  const response = await fetch(`${SNOWSIGN_PUBLIC_API}/embed-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SNOWSIGN_API_KEY,
    },
    body: JSON.stringify({
      purpose: 'contract_create',
      allowed_origins: ['https://erp.example.com'],
      flows: ['template_send'],
      external_system: 'customer-erp',
      external_id: externalId,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    return res.status(response.status).json({
      message: json.error?.message || '스노우싸인 embed session 생성에 실패했습니다.',
    });
  }

  res.json({
    iframe_url: json.data.iframe_url,
  });
});
```

### 브라우저

```js
async function openHostedEmbed({ externalId }) {
  const response = await fetch('/api/snowsign/embed-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ externalId }),
  });

  const data = await response.json();

  const iframe = document.querySelector('#snowsign-embed');
  iframe.src = data.iframe_url;
}
```

```html
<iframe
  id="snowsign-embed"
  title="스노우싸인 contract creation"
  style="width: 100%; height: 720px; border: 0;"
  allow="clipboard-write"
></iframe>
```

---

## 문제 해결

### iframe이 연결 실패로 표시됩니다

- `iframe_url`이 만료되었을 수 있습니다. 새 Embed Session을 발급하세요.
- `allowed_origins`가 실제 parent origin과 다를 수 있습니다.
- API Key가 폐기되었거나 만료되었는지 확인하세요.

### 같은 외부 요청의 embed session이 이미 진행 중이라고 표시됩니다

같은 `external_system + external_id` 또는 `reference_id`로 이미 열린 iframe 세션이 있다는 뜻입니다.

- 새 작업을 시작하는 경우에는 새 `external_id`로 Embed Session을 다시 발급하세요.
- 같은 업무 화면을 하나만 허용하려는 경우에는 기존 iframe을 계속 사용하거나 사용자에게 이미 진행 중인 작업을 안내하세요.

### origin 오류가 발생합니다

`allowed_origins`에는 전체 페이지 URL이 아니라 origin만 넣어야 합니다.

잘못된 예:

```json
["https://erp.example.com/contracts/1004"]
```

올바른 예:

```json
["https://erp.example.com"]
```

### postMessage가 수신되지 않습니다

- iframe이 실제로 `snowsign.embed.ready`를 보냈는지 브라우저 개발자 도구에서 확인하세요.
- `event.origin` 검증 값이 `https://app.snowsign.jtsnowball.com`인지 확인하세요.

### AI 모드가 보이지 않습니다

- Embed Session의 `flows`에 `ai_draft` 또는 `ai_send`가 있어야 합니다.

### AI PDF 생성 후 계약 생성이 실패합니다

- 초안 생성에는 `ai_draft` 또는 `ai_send`가 필요합니다.
- 즉시 발송에는 `ai_send`가 필요합니다.
- AI PDF 렌더링은 비동기 작업이므로 iframe이 완료 상태를 받을 때까지 기다려야 합니다.
- message handler 등록이 iframe 생성보다 늦어도 완료 이벤트는 받을 수 있지만, ready 이벤트는 놓칠 수 있습니다.

### 즉시 발송 버튼이 보이지 않습니다

flows에 즉시 발송용 flow가 필요합니다.

- PDF 즉시 발송: `["pdf_send"]`
- 템플릿 즉시 발송: `["template_send"]`

### 대량 발송 중 일부 행이 실패했습니다

`snowsign.embed.completed` payload의 실패 정보를 외부 화면에 표시하고, 실패 행만 수정해 새 Embed Session으로 다시 시도하는 흐름을 권장합니다.
