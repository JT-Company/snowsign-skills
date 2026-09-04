# 스노우싸인 Public API 가이드

## 목차

- [개요](#개요)
- [인증](#인증)
- [API 목록](#api-목록)
- [Hosted Embed](#hosted-embed)
- [계약서 API](#계약서-api)
  - [계약서 목록 조회](#계약서-목록-조회)
  - [계약서 상세 조회](#계약서-상세-조회)
  - [계약서 상태 조회](#계약서-상태-조회)
  - [템플릿 계약서 생성](#템플릿-계약서-생성)
  - [PDF 업로드 세션 생성](#pdf-업로드-세션-생성)
  - [PDF 업로드 진단](#pdf-업로드-진단)
  - [PDF 계약서 생성](#pdf-계약서-생성)
  - [계약서 발송](#계약서-발송)
  - [계약서 취소](#계약서-취소)
  - [리마인더 발송](#리마인더-발송)
  - [계약서 다운로드](#계약서-다운로드)
  - [감사추적인증서 다운로드](#감사추적인증서-다운로드)
  - [계약서 일괄 다운로드](#계약서-일괄-다운로드)
  - [감사추적인증서 일괄 다운로드](#감사추적인증서-일괄-다운로드)
- [템플릿 API](#템플릿-api)
  - [PDF 템플릿 생성](#pdf-템플릿-생성)
  - [템플릿 목록 조회](#템플릿-목록-조회)
  - [템플릿 상세 조회](#템플릿-상세-조회)
  - [템플릿 원본 파일 다운로드](#템플릿-원본-파일-다운로드)
- [링크서명 API](#링크서명-api)
  - [링크서명 생성](#링크서명-생성)
  - [링크서명 조회 및 관리](#링크서명-조회-및-관리)
  - [완료 계약 조회](#완료-계약-조회)
- [에러 처리](#에러-처리)
- [업로드 세션 제한](#업로드-세션-제한)
- [샘플 코드](#샘플-코드)
- [부록](#부록)

---

## 개요

스노우싸인 Public API를 통해 외부 시스템에서 전자계약 기능을 연동할 수 있습니다.

| 항목 | 값 |
|------|------|
| Base URL | `https://api-snowsign.jtsnowball.com/public` |
| 프로토콜 | HTTPS |
| 응답 형식 | JSON (UTF-8) |
| 인증 방식 | `X-API-Key` 헤더 |

---

## 인증

### API Key 발급

1. 스노우싸인 웹 콘솔 → **조직 설정** → **API 키**
2. **새 API 키** → 키 이름과 사용 목적 입력 → 즉시 활성화
3. API Key 확인

> ⚠️ API Key는 최초 생성 시에만 확인할 수 있습니다. 안전한 곳에 보관하세요.

### 인증 방법

모든 API 요청에 `X-API-Key` 헤더를 포함합니다.

```http
X-API-Key: YOUR_API_KEY
```

---

## API 목록

### Hosted Embed

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/v1/embed-sessions` | 외부 서버가 PDF/템플릿/AI 계약 생성 iframe 세션 발급 |

### 계약서

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | [/v1/contracts](#계약서-목록-조회) | 계약서 목록 조회 |
| GET | [/v1/contracts/{id}](#계약서-상세-조회) | 계약서 상세 조회 |
| GET | [/v1/contracts/{id}/status](#계약서-상태-조회) | 계약서 상태 조회 |
| POST | [/v1/templates/{id}/create-contract](#템플릿-계약서-생성) | 템플릿 기반 계약서 생성 |
| POST | [/v1/uploads](#pdf-업로드-세션-생성) | PDF 업로드 세션 생성 |
| POST | [/v1/uploads/{id}/diagnostics](#pdf-업로드-진단) | 업로드 PDF 사전 진단(선택) |
| POST | [/v1/contracts](#pdf-계약서-생성) | 업로드 PDF 기반 계약서 생성. `send_immediately=true`이면 즉시 발송 |
| POST | [/v1/contracts/{id}/send](#계약서-발송) | 계약서 발송 |
| POST | [/v1/contracts/{id}/cancel](#계약서-취소) | 계약서 취소 |
| POST | [/v1/contracts/{id}/remind](#리마인더-발송) | 리마인더 이메일 발송 |
| GET | [/v1/contracts/{id}/download](#계약서-다운로드) | 완료된 계약서 PDF 다운로드 |
| GET | [/v1/contracts/{id}/audit-certificate](#감사추적인증서-다운로드) | 감사추적인증서 다운로드 |
| POST | [/v1/contracts/bulk-download](#계약서-일괄-다운로드) | 여러 계약서 PDF 일괄 다운로드 |
| POST | [/v1/contracts/bulk-audit-certificates](#감사추적인증서-일괄-다운로드) | 감사추적인증서 일괄 다운로드 |

### 템플릿

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | [/v1/templates](#pdf-템플릿-생성) | 업로드 PDF 기반 템플릿 생성 |
| GET | [/v1/templates](#템플릿-목록-조회) | 템플릿 목록 조회 |
| GET | [/v1/templates/{id}](#템플릿-상세-조회) | 템플릿 상세 조회 |
| GET | [/v1/templates/{id}/download](#템플릿-원본-파일-다운로드) | 템플릿 원본 파일 다운로드 |

### 링크서명

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | [/v1/link-signings](#링크서명-생성) | 링크서명 생성 |
| GET | [/v1/link-signings](#링크서명-조회-및-관리) | 링크서명 목록 조회 |
| GET | [/v1/link-signings/{id}](#링크서명-조회-및-관리) | 링크서명 상세 조회 |
| PATCH | [/v1/link-signings/{id}](#링크서명-조회-및-관리) | 링크서명 설정 수정 |
| POST | `/v1/link-signings/{id}/pause` | 일시중지 |
| POST | `/v1/link-signings/{id}/resume` | 재개 |
| POST | `/v1/link-signings/{id}/close` | 종료 |
| GET | [/v1/link-signings/{id}/contracts](#완료-계약-조회) | 링크별 완료 계약 조회 |

---

## Hosted Embed

Hosted Embed는 외부 ERP/그룹웨어 화면 안의 iframe에서 스노우싸인 계약 생성 흐름을 제공하는 방식입니다. 외부 서버는 API Key로 단기 Embed Session을 만들고, 브라우저에는 `iframe_url`만 전달합니다. 스노우싸인 API Key는 브라우저, iframe URL, postMessage payload에 노출하지 않습니다.

구현 순서와 샘플 코드는 [Hosted Embed 개발 가이드](./hosted-embed-guide.md)를 참고하세요.

지원 흐름:
- PDF 업로드 계약 생성/즉시 발송
- 템플릿 단건 계약 생성
- 템플릿 대량 발송 spreadsheet UI
- AI 문서 작성 후 PDF 계약 생성/즉시 발송

## 관리 그룹과 결재

API Key는 발급자 개인 권한이 아닌 조직 자격증명입니다. API로 만든 계약·링크서명·템플릿은 `전체 업무` 범위에 속하며, 템플릿 조회·사용에는 모든 멤버가 사용할 수 있는 템플릿만 포함됩니다.

결재가 필요하면 API는 자동 상신하지 않고 에러를 반환합니다.

회사 도장은 Public API로 직접 추가할 수 없으며, 도장이 배치된 템플릿을 스노우싸인에서 미리 준비해 쓸 수 있습니다.

기본 흐름:

1. 외부 서버가 `POST /v1/embed-sessions`를 `X-API-Key`로 호출합니다.
2. 스노우싸인이 `iframe_url`을 반환합니다.
3. 외부 서비스가 브라우저에 `iframe_url`을 내려 iframe을 표시합니다.
4. 스노우싸인 iframe 안에서 계약 생성 화면이 실행됩니다.
5. 생성/발송 결과는 `snowsign.embed.*` postMessage 이벤트로 parent window에 전달됩니다.

### Embed Session 생성

```http
POST /v1/embed-sessions
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

```json
{
  "purpose": "contract_create",
  "allowed_origins": ["https://erp.example.com"],
  "flows": ["template_bulk"],
  "external_system": "customer-erp",
  "external_id": "ERP-2026-00123"
}
```

`external_system + external_id` 또는 `reference_id`는 같은 업무 요청의 iframe 세션이 중복 생성되지 않도록 하는 식별자로도 사용됩니다. 서로 다른 사용자가 같은 API key로 동시에 열 수 있도록 사용자/계약/주문 단위의 고유 값을 넣어주세요.

flows:

- PDF 초안 작성: `pdf_draft`
- PDF 작성 및 발송: `pdf_send`
- 템플릿 초안 작성: `template_draft`
- 템플릿 작성 및 발송: `template_send`
- 템플릿 대량 발송: `template_bulk`
- AI 문서 초안 작성: `ai_draft`
- AI 문서 작성 및 발송: `ai_send`
- 전체: `all`

전체 흐름을 허용하려면 `flows: ["all"]`만 전달합니다.

**Response**

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

---

## 계약서 API

외부 ERP/그룹웨어에서 PDF 문서를 스노우싸인 계약/템플릿 생성에 연결할 때는 업로드 세션을 사용합니다. API Key는 서버에만 보관하고, 브라우저 SDK에는 노출하지 마세요.

기본 흐름:

1. ERP 서버가 `POST /v1/uploads`로 `upload_id`와 업로드 정보를 발급받습니다.
2. 브라우저 또는 ERP 서버가 발급받은 업로드 정보로 PDF를 업로드합니다.
3. ERP 서버가 `document_upload_id`와 필드 위치 정보를 계약/템플릿 생성 API에 전달합니다.
4. 스노우싸인이 업로드된 PDF를 최종 검증한 뒤 계약서 또는 템플릿을 생성합니다.

**계약 응답 공통 필드**

| 필드 | 포함 응답 | 설명 |
|------|-----------|------|
| `responsible_permission_group` | 목록, 상세 | 계약의 관리 그룹 `{ uuid, name, path }` |
| `approval_status` | 생성, 목록, 상세, 상태 | 최신 결재 상태. 결재 요청이 없으면 `null` |
| `dispatch_mode` | 생성, 발송, 목록, 상세, 상태 | `platform`: 스노우싸인에서 발송, `external`: 서명 링크 직접 전달 |
| `scheduled_send_at` | 생성, 발송, 목록, 상세, 상태 | 예약 발송 시각. 예약되지 않았으면 `null` |
| `schedule_failure_code` | 생성, 발송, 목록, 상세, 상태 | 예약 실행 실패 코드. 실패하지 않았으면 `null` |
| `link_signing` | 상세, 상태 | 링크서명으로 생성된 계약에만 `{ id, name }` 포함 |
| `participants[].email_delivery.failure_reason` | 상세 | SMTP 원문과 수신자 주소를 제외한 표준 전달 실패 사유 |

예약 실행 실패 코드는 `approval_required`, `subscription_required`, `payment_past_due`, `quota_exceeded`, `authorization_failed`, `resource_invalid`, `system_error` 중 하나입니다.

### 계약서 목록 조회

`GET /v1/contracts`

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| page | integer | N | 페이지 번호 (기본값: 1) |
| per_page | integer | N | 페이지당 항목 수 (기본값: 20, 최대: 100) |
| status | string | N | 상태 필터 (draft, scheduled, pending, in_progress, completed, cancelled, expired, rejected) |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "contract_id": "uuid-string",
      "title": "업무 위탁 계약서",
      "status": "in_progress",
      "dispatch_mode": "platform",
      "approval_status": null,
      "responsible_permission_group": { "uuid": "permission-group-uuid", "name": "전체 업무", "path": ["전체 업무"] },
      "email_issue": true,
      "email_issue_count": 1,
      "scheduled_send_at": null,
      "schedule_failure_code": null,
      "created_at": "2025-01-06T10:00:00Z",
      "sent_at": "2025-01-06T10:05:00Z",
      "completed_at": null
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total_items": 45,
      "total_pages": 3
    }
  }
}
```

### 계약서 상세 조회

`GET /v1/contracts/{contract_id}`

**Response**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "description": "2025년 프로젝트 관련 업무 위탁 계약",
    "status": "in_progress",
    "dispatch_mode": "platform",
    "approval_status": null,
    "responsible_permission_group": { "uuid": "permission-group-uuid", "name": "전체 업무", "path": ["전체 업무"] },
    "email_issue": true,
    "email_issue_count": 1,
    "scheduled_send_at": null,
    "schedule_failure_code": null,
    "signing_order": "sequential",
    "participants": [
      {
        "participant_id": "participant-uuid-1",
        "name": "홍길동",
        "email": "hong@example.com",
        "phone": "010-1234-5678",
        "signing_order": 1,
        "status": "signed",
        "signed_at": "2025-01-06T14:30:00Z",
        "security_method": "identity_verification",
        "mobile_alimtalk_enabled": true,
        "locale": "en",
        "email_delivery": {
          "status": "delivered",
          "attempted_at": "2025-01-06T10:05:00Z",
          "event_at": "2025-01-06T10:05:10Z",
          "failure_reason": null,
          "attempt_count": 1,
          "unresolved_issue": null
        }
      },
      {
        "participant_id": "participant-uuid-2",
        "name": "김철수",
        "email": "kim@example.com",
        "phone": null,
        "signing_order": 2,
        "status": "pending",
        "signed_at": null,
        "security_method": "password",
        "mobile_alimtalk_enabled": false,
        "locale": "ko",
        "email_delivery": {
          "status": "bounced",
          "attempted_at": "2025-01-06T10:05:00Z",
          "event_at": "2025-01-06T10:05:12Z",
          "failure_reason": "수신자 이메일 주소가 존재하지 않습니다. (5.1.1)",
          "attempt_count": 1,
          "unresolved_issue": {
            "status": "bounced",
            "event_at": "2025-01-06T10:05:12Z",
            "failure_reason": "수신자 이메일 주소가 존재하지 않습니다. (5.1.1)"
          }
        }
      }
    ],
    "variables": {
      "계약금액": "3,000,000원",
      "계약기간": "2026-04-01 ~ 2027-03-31"
    },
    "integrity_hash": null,
    "created_at": "2025-01-06T10:00:00Z",
    "sent_at": "2025-01-06T10:05:00Z",
    "completed_at": null,
    "cancelled_at": null,
    "cancelled_reason": null,
    "expires_at": "2025-01-31T23:59:59Z"
  }
}
```

`dispatch_mode`가 `external`인 경우, 참여자별 `signing_url`과 `expires_at`을 추가로 확인할 수 있습니다.

---

### 계약서 상태 조회

`GET /v1/contracts/{contract_id}/status`

**Response**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "status": "in_progress",
    "dispatch_mode": "platform",
    "approval_status": null,
    "email_issue": true,
    "email_issue_count": 1,
    "scheduled_send_at": null,
    "schedule_failure_code": null,
    "participants_status": {
      "total": 2,
      "signed": 1,
      "pending": 1
    }
  }
}
```

---

### 템플릿 계약서 생성

`POST /v1/templates/{template_id}/create-contract`

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | Y | 계약서 제목 |
| description | string | N | 계약서 설명 |
| dispatch_mode | string | N | 계약서 전달 방식. 기본 `platform`. `external`이면 스노우싸인이 참여자에게 발송하지 않음 |
| participants | array | Y | 참여자 목록 (역할 매핑) |
| variables | object | N | 템플릿 변수 값. 텍스트 변수는 문자열, 날짜 변수는 ISO 날짜/연월 문자열, 체크박스 변수는 boolean |
| signing_order | string | N | 서명 순서 (템플릿 기본값 사용 시 생략) |
| send_immediately | boolean | N | `platform` 계약을 생성 후 즉시 발송. 기본값 `false` |
| scheduled_send_at | string | N | 예약 발송 시각. timezone을 포함한 ISO 8601 형식 |
| message | string | N | 발송 시 참여자에게 전달할 메시지 |

**participants 항목**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | Y | 참여자 이름 |
| email | string 또는 null | 조건부 | 스노우싸인에서 계약 발송시 필수. 직접 발송(`external`)이면 이메일 또는 휴대전화번호 중 하나 필수 |
| phone | string | 조건부 | 전화번호 확인·간편인증 또는 이메일 없는 직접 발송 참여자이면 필수 |
| mobile_alimtalk_enabled | boolean | N | 모바일 알림톡 발송 여부. 생략 시 템플릿 역할 정책 사용 |
| locale | string | N | `ko` 또는 `en`. 생략 시 템플릿 역할 언어 사용 |
| role | string | Y | 템플릿에 정의된 역할명 (예: "근로자", "회사") |
| security | object | 조건부 | 보통 생략. 템플릿의 비밀번호 인증이 있는 역할에는 `{ "method": "password", "value": "..." }` 필요 |

**variables 사용법**

- 동일한 변수명으로 여러개 배치할 수 있으며, 하나의 값을 전달하면 모두 동일하게 적용됩니다.
- 텍스트 변수는 `variables` 객체에 `{ "변수명": "치환할 값" }` 형식으로 전달합니다.
- 날짜 변수는 `date_precision`이 `day`이면 `YYYY-MM-DD`, `month`이면 `YYYY-MM` 형식으로 전달합니다.
- 체크박스 변수는 `{ "변수명": true }` 또는 `{ "변수명": false }`로 전달합니다.

**Request 예시**

```json
{
  "title": "홍길동 근로계약서",
  "send_immediately": true,
  "participants": [
    { "name": "홍길동", "email": "hong@example.com", "role": "근로자" }
  ],
  "variables": {
    "계약시작일": "2025-02-01",
    "개인정보동의": true,
    "급여": "3,500,000원"
  }
}
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "contract_id": "contract-uuid",
    "title": "홍길동 근로계약서",
    "status": "pending",
    "approval_status": null,
    "scheduled_send_at": null,
    "schedule_failure_code": null,
    "sent_at": "2026-09-05T01:30:00"
  },
  "message": "계약서가 생성 및 발송되었습니다."
}
```

#### 자체 문자·알림톡으로 서명 링크 보내기

위 요청에서 `dispatch_mode`를 `external`로 설정하면 계약이 즉시 시작됩니다.
참여자 연락처는 `email`, `phone` 중 하나 이상을 입력합니다.
스노우싸인은 참여자에게 메시지를 보내지 않고 서명 링크를 반환합니다.
서명 예약 기능은 이용할 수 없습니다.

**응답 필드 예시**

```json
{
  "data": {
    "contract_id": "contract-uuid",
    "status": "pending",
    "dispatch_mode": "external",
    "participants": [
      {
        "participant_id": "participant-uuid",
        "phone": "01012345678",
        "security_method": "phone",
        "signing_url": "https://...",
        "expires_at": "2026-10-05T01:30:00"
      }
    ]
  }
}
```

---

### PDF 업로드 세션 생성

`POST /v1/uploads`

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| purpose | string | Y | `contract_document` 또는 `template_document` |
| filename | string | Y | 원본 파일명 |
| content_type | string | Y | `application/pdf` |
| size_bytes | integer | Y | 업로드 예정 파일 크기. 최대 50MB |

**Response**

```json
{
  "success": true,
  "data": {
    "upload_id": "upl_abc123",
    "upload_url": "https://...",
    "fields": {
      "key": "...",
      "Content-Type": "application/pdf"
    },
    "max_size_bytes": 52428800,
    "allowed_content_types": ["application/pdf"],
    "expires_at": "2026-06-11T04:00:00Z"
  }
}
```

**정책**

- 업로드 세션은 10분 동안 유효합니다.
- 응답의 `upload_url`과 `fields`는 PDF 업로드 요청에 그대로 사용합니다.

### PDF 업로드 진단

`POST /v1/uploads/{upload_id}/diagnostics`

계약/템플릿 생성 전에 PDF 경고를 사용자에게 보여주고 싶은 경우에만 호출합니다. 계약/템플릿 생성 API는 이 API 호출 여부와 관계없이 업로드된 PDF를 다시 검증합니다.

**Response**

```json
{
  "success": true,
  "data": {
    "upload_id": "upl_abc123",
    "pdf": {
      "upload_policy": "allow",
      "page_count": 2,
      "render_profile": "fontFace",
      "warnings": [],
      "errors": []
    }
  }
}
```

---

### PDF 계약서 생성

`POST /v1/contracts`

업로드 PDF와 필드 위치 정보로 계약서를 생성합니다. `platform` 계약은 즉시 발송하거나 예약하지 않으면 초안으로 생성됩니다.

**Request Body 주요 필드**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | Y | 계약서 제목 |
| document_upload_id | string | Y | 업로드 세션 ID |
| dispatch_mode | string | N | 링크 전달 방식. 기본 `platform` |
| send_immediately | boolean | N | `platform` 계약을 생성 후 즉시 발송. 기본값 false |
| scheduled_send_at | string | N | 예약 발송 시각. timezone을 포함한 ISO 8601 형식 |
| participants | array | Y | 참여자 목록 |
| signature_fields | array | Y | 입력칸/서명칸 위치 목록 |
| variables | object | N | 변수 필드 값 |
| integration | object | N | 외부 시스템 자유 metadata |

대부분의 경우 참여자는 `role` 하나로 필드와 매핑할 수 있습니다. 같은 역할명이 2명 이상이면 구분이 모호하므로 `key`와 `role_name`을 명시하세요.

`signature_fields` 좌표는 PDF.js `getViewport({ scale: 1 })` 기준 pixel 좌표입니다. 원점은 페이지 좌상단이며, `page_number`는 1부터 시작합니다.

**signature_fields 항목 주요 필드**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| participant 또는 participant_key | string | 조건부 | 참여자 역할명 또는 참여자 key. `type: "variable"`에는 사용하지 않습니다. |
| type | string | Y | `signature`, `stamp`, `name`, `text`, `date`, `checkbox`, `variable` |
| page_number | integer | Y | PDF 페이지 번호. 1부터 시작 |
| position_x / position_y | number | Y | PDF.js pixel 좌표 |
| width / height | number | Y | 입력칸 크기 |
| position_unit | string | N | `pixel`만 지원 |
| is_required | boolean | N | 필수 입력 여부. 생략 시 true. `signature`/`stamp`/`name`은 항상 true, `variable`은 false, `text`/`date`/`checkbox`만 false 지정 가능 |
| font_size | integer | N | 텍스트/날짜/변수 텍스트 PDF 표시 폰트 크기. 1~72 |
| text_align | string | N | 텍스트 정렬. `left`, `center`, `right` 중 하나. `name`, `text`, `date`, 텍스트/날짜 `variable`에 적용되며 서명/체크박스에는 저장되지 않습니다. |
| placeholder_text | string | N | 텍스트 입력 안내 문구. 날짜 입력칸에는 저장하지 않습니다. |
| variable_name | string | 조건부 | `type: "variable"`일 때 필수 |
| variable_value_type | string | N | 변수 값 타입. `text`, `checkbox`, `date` 중 하나. 기본값 `text` |
| date_precision | string | N | 날짜 입력/날짜 변수 정밀도. `day` 또는 `month` |
| date_format_pattern | string | N | 날짜 표시 형식. 예: `YYYY년 MM월 DD일`, `YYYY-MM-DD`, `YYYY/MM` |
| fill_background | boolean | N | 날짜/변수 표시 시 PDF 배경을 흰색으로 가릴지 여부 |

**Request 예시**

```json
{
  "title": "외주 계약서 - 홍길동",
  "document_upload_id": "upl_abc123",
  "signing_order": "parallel",
  "send_immediately": true,
  "message": "서명 부탁드립니다.",
  "participants": [
    {
      "role": "근로자",
      "name": "홍길동",
      "email": "hong@example.com",
      "phone": "010-1234-5678",
      "security": { "method": "identity_verification" },
      "mobile_alimtalk_enabled": false,
      "locale": "ko"
    }
  ],
  "signature_fields": [
    {
      "participant": "근로자",
      "type": "signature",
      "page_number": 2,
      "position_x": 410,
      "position_y": 710,
      "width": 120,
      "height": 50,
      "position_unit": "pixel",
      "is_required": true
    },
    {
      "type": "variable",
      "variable_name": "contract_amount",
      "variable_value_type": "text",
      "page_number": 1,
      "position_x": 180,
      "position_y": 240,
      "width": 120,
      "height": 18,
      "fill_background": true,
      "text_align": "right"
    }
  ],
  "variables": {
    "contract_amount": "3,000,000원"
  },
  "integration": {
    "external_system": "customer-erp",
    "external_id": "ERP-2026-0001"
  }
}
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "title": "외주 계약서 - 홍길동",
    "status": "pending",
    "dispatch_mode": "platform",
    "approval_status": null,
    "sent_at": "2026-06-11T03:20:00Z"
  }
}
```

`platform` 계약에서 `send_immediately=true`와 `scheduled_send_at`은 함께 지정할 수 없습니다. 둘 다 생략하면 초안으로 생성됩니다.

### 계약서 발송

`POST /v1/contracts/{contract_id}/send`

> ⚠️ 발송 시 월간 계약 사용량이 차감됩니다.

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | N | 참여자에게 전달할 메시지 |
| scheduled_send_at | string 또는 null | N | 값 지정 시 예약 또는 변경, `null`이면 예약 취소. 필드 생략 시 즉시 발송 |

**Response**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "status": "scheduled",
    "dispatch_mode": "platform",
    "scheduled_send_at": "2026-09-04T01:30:00",
    "schedule_failure_code": null,
    "sent_at": null
  },
  "message": "계약서 발송을 예약했습니다."
}
```

즉시 발송하려면 `scheduled_send_at`을 생략하고, 예약을 취소하려면 명시적으로 `null`을 전달합니다. 예약 시각은 현재보다 뒤이고 마감일보다 앞이어야 합니다.

---

### 계약서 취소

`POST /v1/contracts/{contract_id}/cancel`

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| reason | string | N | 취소 사유 |

**Response**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "status": "cancelled"
  },
  "message": "계약서가 취소되었습니다."
}
```

---

### 리마인더 발송

`POST /v1/contracts/{contract_id}/remind`

서명 대기 중인 참여자에게 리마인더 이메일을 발송합니다.

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | N | 참여자에게 전달할 메시지 |
| participant_uuids | array | N | 특정 참여자에게만 발송할 참여자 UUID 목록 |

**Response**

```json
{
  "success": true,
  "message": "리마인더가 발송되었습니다."
}
```

---

### 계약서 다운로드

`GET /v1/contracts/{contract_id}/download`

완료된 계약서 PDF의 다운로드 URL을 발급합니다. URL은 1시간 동안 유효합니다.

**Response**

```json
{
  "success": true,
  "data": {
    "download_url": "https://...",
    "filename": "홍길동_업무위탁계약서.pdf",
    "expires_at": "2025-01-06T11:00:00Z"
  }
}
```

> ⚠️ 계약서 상태가 `completed`인 경우에만 다운로드 가능합니다.

---

### 감사추적인증서 다운로드

`GET /v1/contracts/{contract_id}/audit-certificate`

완료된 계약서의 감사추적인증서 PDF 다운로드 URL을 발급합니다.

**Response**

```json
{
  "success": true,
  "data": {
    "download_url": "https://...",
    "filename": "홍길동_업무위탁계약서_감사추적인증서.pdf",
    "expires_at": "2025-01-06T11:00:00Z"
  }
}
```

---

### 계약서 일괄 다운로드

`POST /v1/contracts/bulk-download`

여러 계약서의 PDF 다운로드 URL을 한 번에 발급합니다.

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| contract_ids | array | Y | 계약서 ID 목록 (최대 50건) |

**Request 예시**

```json
{
  "contract_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response**

```json
{
  "success": true,
  "data": [
    {
      "contract_id": "uuid-1",
      "download_url": "https://...",
      "filename": "홍길동_계약서.pdf",
      "error": null
    },
    {
      "contract_id": "uuid-2",
      "download_url": null,
      "filename": null,
      "error": "계약서가 아직 완료되지 않았습니다."
    }
  ]
}
```

---

### 감사추적인증서 일괄 다운로드

`POST /v1/contracts/bulk-audit-certificates`

여러 계약서의 감사추적인증서 다운로드 URL을 한 번에 발급합니다.

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| contract_ids | array | Y | 계약서 ID 목록 (최대 50건) |

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "contract_id": "uuid-1",
      "download_url": "https://...",
      "filename": "홍길동_감사추적인증서.pdf",
      "error": null
    },
    {
      "contract_id": "uuid-2",
      "download_url": null,
      "filename": null,
      "error": "계약서가 아직 완료되지 않았습니다."
    }
  ]
}
```

---

## 템플릿 API

### PDF 템플릿 생성

`POST /v1/templates`

업로드 PDF와 역할/필드 위치 정보로 스노우싸인 템플릿을 생성합니다.

**Request Body 주요 필드**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | Y | 템플릿명 |
| document_upload_id | string | Y | 업로드 세션 ID |
| signing_order | string | N | `parallel` 또는 `sequential` |
| deadline_days | integer | N | 기본 마감 기한 |
| signers | array | Y | 역할 목록 |
| signature_fields | array | Y | 입력칸/서명칸 위치 목록 |
| integration | object | N | 외부 시스템 metadata |

템플릿은 모든 멤버가 사용할 수 있는 `전체 업무` 범위로 생성됩니다.

대부분의 경우 템플릿 역할은 문자열 배열로 만들 수 있습니다. 역할 언어를 지정하려면 `{ "role": "...", "locale": "ko|en" }` 형식을 사용하며 기본값은 `ko`입니다. 같은 역할명이 중복되면 `key`와 `role_name`을 명시하세요.

`signature_fields` 항목은 PDF 계약서 생성 API와 동일하게 `is_required`, `text_align`, `font_size`, 날짜 메타데이터, 변수 메타데이터를 사용할 수 있습니다. `is_required`는 `text`/`date`/`checkbox`에서만 false 지정 가능하며, `text_align`은 `left`, `center`, `right` 중 하나이고 `name`, `text`, `date`, 텍스트/날짜 `variable`에 적용됩니다.

**Request 예시**

```json
{
  "name": "표준 외주계약서",
  "document_upload_id": "upl_template_abc",
  "signing_order": "parallel",
  "deadline_days": 14,
  "signers": [{ "role": "근로자", "locale": "en" }],
  "signature_fields": [
    {
      "role": "근로자",
      "type": "signature",
      "page_number": 2,
      "position_x": 410,
      "position_y": 710,
      "width": 120,
      "height": 50,
      "position_unit": "pixel",
      "is_required": true
    },
    {
      "role": "근로자",
      "type": "date",
      "page_number": 1,
      "position_x": 180,
      "position_y": 240,
      "width": 120,
      "height": 24,
      "date_precision": "day",
      "date_format_pattern": "YYYY-MM-DD",
      "text_align": "center"
    }
  ],
  "integration": {
    "external_system": "customer-erp",
    "external_id": "ERP-TEMPLATE-001",
    "sdk_version": "1.0.0"
  }
}
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "template_id": "uuid-string",
    "name": "표준 외주계약서"
  }
}
```

### 템플릿 목록 조회

`GET /v1/templates`

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| page | integer | N | 페이지 번호 |
| per_page | integer | N | 페이지당 항목 수 |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "template_id": "uuid-string",
      "name": "근로계약서 양식",
      "description": "정규직 근로계약서 표준 양식",
      "category": "HR",
      "signing_order": "sequential",
      "deadline_days": 7,
      "can_create_link_signing": false,
      "signers": [
        { "role_name": "근로자", "signing_order": 1, "security_method": "easy_cert", "mobile_alimtalk_enabled": true, "locale": "en" },
        { "role_name": "회사", "signing_order": 2, "security_method": "password", "mobile_alimtalk_enabled": false, "locale": "ko" }
      ]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total_items": 5,
      "total_pages": 1
    }
  }
}
```

---

### 템플릿 상세 조회

`GET /v1/templates/{template_id}`

**Response**

```json
{
  "success": true,
  "data": {
    "template_id": "uuid-string",
    "name": "근로계약서 양식",
    "description": "정규직 근로계약서 표준 양식",
    "category": "HR",
    "signing_order": "sequential",
    "deadline_days": 7,
    "can_create_link_signing": false,
    "signers": [
      { "uuid": "signer-uuid-1", "role_name": "근로자", "signing_order": 1, "security_method": "easy_cert", "mobile_alimtalk_enabled": true, "locale": "en" },
      { "uuid": "signer-uuid-2", "role_name": "회사", "signing_order": 2, "security_method": "password", "mobile_alimtalk_enabled": false, "locale": "ko" }
    ],
    "signature_fields": [
      {
        "uuid": "field-uuid-1",
        "role_name": "근로자",
        "type": "signature",
        "page_number": 1,
        "position_x": 100.0,
        "position_y": 500.0,
        "width": 150.0,
        "height": 50.0,
        "is_required": true,
        "label": null,
        "display_order": 1,
        "date_precision": null,
        "date_format_pattern": null,
        "fill_background": null,
        "text_align": null
      }
    ],
    "variables": [
      {
        "name": "계약시작일",
        "label": "계약시작일",
        "value_type": "date",
        "default_value": null,
        "is_required": false,
        "date_precision": "day",
        "date_format_pattern": "YYYY년 MM월 DD일",
        "fill_background": true,
        "text_align": "center"
      },
      {
        "name": "개인정보동의",
        "label": "개인정보동의",
        "value_type": "checkbox",
        "default_value": null,
        "is_required": false,
        "date_precision": null,
        "date_format_pattern": null,
        "fill_background": false,
        "text_align": null
      },
      {
        "name": "급여",
        "label": "급여",
        "value_type": "text",
        "default_value": "3,000,000원",
        "is_required": false,
        "date_precision": null,
        "date_format_pattern": null,
        "fill_background": false,
        "text_align": "right"
      }
    ]
  }
}
```

**상세 응답 필드**

| 필드 | 설명 |
|------|------|
| `signers[].security_method` | `email`, `password`, `easy_cert`. 값이 없으면 `email` |
| `signers[].mobile_alimtalk_enabled` | 역할 기반 계약의 알림톡 기본값 |
| `signers[].locale` | 역할의 기본 이메일·서명 화면 언어 |
| `signature_fields` | 변수 필드를 제외한 서명자 입력 필드 |
| `signature_fields[].is_required` | 서명·인감·이름은 항상 `true`; 텍스트·날짜·체크박스는 저장값 |
| `variables` | 동일한 변수명을 하나로 합친 변수 목록 |
| `variables[].is_required` | 항상 `false` |
| `signature_fields[].text_align`, `variables[].text_align` | `left`, `center`, `right`, `null`; 정렬 대상이 아니면 `null` |
| `variables[].value_type` | `text`, `checkbox`, `date`. 날짜는 날짜 표시 메타 포함 |
| `can_create_link_signing` | PDF가 있고 서명자 역할이 정확히 하나이면 `true` |

---

### 템플릿 원본 파일 다운로드

`GET /v1/templates/{template_id}/download`

템플릿 원본 PDF 파일의 임시 다운로드 URL을 반환합니다. URL은 발급 후 1시간 동안 유효합니다.

**Response**

```json
{
  "success": true,
  "data": {
    "download_url": "https://s3.amazonaws.com/...",
    "filename": "근로계약서 양식.pdf",
    "expires_at": "2025-01-06T11:00:00+00:00"
  }
}
```

**Errors**: `TEMPLATE_NOT_FOUND`, `TEMPLATE_FILE_NOT_FOUND`

---

## 링크서명 API

**링크서명 응답 공통 필드**

| 필드 | 포함 응답 | 설명 |
|------|-----------|------|
| `responsible_permission_group` | 생성, 목록, 상세 | 링크와 생성 계약의 관리 그룹 `{ uuid, name }` |

### 링크서명 생성

`POST /v1/link-signings`

| 필드 | 필수 | 설명 |
|------|------|------|
| `template_uuid` | 필수 | 템플릿 조회 응답의 `template_id` |
| `name` | 필수 | 링크서명 관리 이름 |
| `max_submissions` | 필수 | 최대 제출 수, 1 이상 |
| `description` | 선택 | 서명자 안내 문구 |
| `expires_at` | 선택 | UTC ISO 8601. 예: `2026-12-31T14:59:59Z` |
| `require_identity_verification` | 선택 | 휴대폰 간편인증 요구 여부. 기본값 `false` |
| `variables` | 선택 | 이 링크로 생성되는 계약에 공통 적용할 템플릿 변수 값 |

```json
{
  "template_uuid": "template-uuid",
  "name": "2026 입사 동의서",
  "description": "내용을 확인하고 서명해주세요.",
  "max_submissions": 100,
  "expires_at": "2026-12-31T14:59:59Z",
  "require_identity_verification": false,
  "variables": {
    "회사명": "주식회사 스노우싸인"
  }
}
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "link_signing_id": "link-signing-uuid",
    "name": "2026 입사 동의서",
    "description": "내용을 확인하고 서명해주세요.",
    "status": "active",
    "template": {
      "template_id": "template-uuid",
      "name": "입사 동의서"
    },
    "responsible_permission_group": { "uuid": "permission-group-uuid", "name": "전체 업무" },
    "link_url": "https://snowsign.jtsnowball.com/link-sign/...",
    "max_submissions": 100,
    "submission_count": 0,
    "expires_at": "2026-12-31T14:59:59",
    "require_identity_verification": false,
    "locale": "ko",
    "created_at": "2026-08-13T09:00:00",
    "updated_at": "2026-08-13T09:00:00"
  }
}
```

### 링크서명 조회 및 관리

| 메서드 | Endpoint | 요청 | 설명 |
|--------|----------|------|------|
| GET | `/v1/link-signings` | 선택 query | 목록 조회 |
| GET | `/v1/link-signings/{id}` | 본문 없음 | 상세와 생성 시 저장한 `variables` 조회 |
| PATCH | `/v1/link-signings/{id}` | 모든 필드 선택 | 전달한 설정만 수정 |
| POST | `/v1/link-signings/{id}/pause` | 본문 없음 | `active → paused` |
| POST | `/v1/link-signings/{id}/resume` | 본문 없음 | `paused → active` |
| POST | `/v1/link-signings/{id}/close` | 본문 없음 | 활성 또는 일시중지 링크 종료 |

목록 query는 모두 선택입니다.

| Query | 설명 |
|-------|------|
| `page` | 페이지 번호. 기본값 1 |
| `per_page` | 페이지당 항목 수. 기본값 20, 최대 100 |
| `status` | `active`, `paused`, `closed`, `expired` |
| `search` | 링크서명 이름 또는 템플릿명 검색 |
| `sort` | `created_at:desc`(기본), `created_at:asc`, `expires_at:asc`, `submission_count:desc`, `name:asc` |

PATCH 요청 필드는 모두 선택이며 전달한 값만 변경합니다.

| 필드 | 설명 |
|------|------|
| `name` | 관리 이름 |
| `description` | 서명자 안내 문구 |
| `max_submissions` | 현재 제출 수보다 작을 수 없는 최대 제출 수 |
| `expires_at` | UTC ISO 8601 만료 일시 |
| `require_identity_verification` | 휴대폰 간편인증 요구 여부 |

`variables`, `template_uuid`, `status`는 PATCH로 수정할 수 없습니다.

### 완료 계약 조회

`GET /v1/link-signings/{link_signing_id}/contracts`

요청 본문은 없습니다. `page`, `per_page`, `search`, `sort` query는 모두 선택이며 해당 링크에서 생성된 완료 계약만 반환합니다.

| Query | 설명 |
|-------|------|
| `page` | 페이지 번호. 기본값 1 |
| `per_page` | 페이지당 항목 수. 기본값 20, 최대 100 |
| `search` | 계약서명 또는 서명자 이름·이메일·연락처 검색 |
| `sort` | `completed_at:desc`(기본), `created_at:desc`, `signer_name:asc` |

```json
{
  "success": true,
  "data": [
    {
      "contract_id": "contract-uuid",
      "title": "2026 입사 동의서",
      "status": "completed",
      "signer_name": "홍길동",
      "signer_email": "hong@example.com",
      "completed_at": "2026-08-13T10:00:00",
      "link_signing": {
        "id": "link-signing-uuid",
        "name": "2026 입사 동의서"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total_items": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

`contract_id`는 기존 계약 상세·상태·완료 문서·감사추적인증서 API에서 사용할 수 있습니다. 일반 `GET /v1/contracts` 목록에는 링크서명 계약이 포함되지 않습니다.

---

## 에러 처리

### 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  },
  "meta": {
    "timestamp": "2025-01-06T10:00:00Z"
  }
}
```

### HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 또는 사용량 초과 |
| 404 | 리소스 없음 |
| 429 | 요청 제한 초과 |
| 500 | 서버 오류 |

### 주요 에러 코드

| 코드 | 설명 |
|------|------|
| API_KEY_REQUIRED | API Key 누락 |
| INVALID_API_KEY | 유효하지 않은 API Key |
| VALIDATION_ERROR | 요청 파라미터 검증 실패 |
| QUOTA_EXCEEDED | 월간 사용량 한도 초과 |
| UPLOAD_SESSION_NOT_FOUND | 업로드 세션을 찾을 수 없음 |
| PDF_UPLOAD_REJECTED | 지원하지 않는 PDF |
| CONTRACT_NOT_FOUND | 계약서를 찾을 수 없음 |
| TEMPLATE_NOT_FOUND | 템플릿을 찾을 수 없음 |
| LINK_SIGNING_NOT_FOUND | 링크서명을 찾을 수 없음 |
| INVALID_LINK_SIGNING_STATUS | 지원하지 않는 목록 상태 |
| INVALID_PUBLIC_LINK_SIGNING_REQUEST | 링크서명 요청 필드 또는 값 오류 |
| INVALID_CONTRACT_STATUS | 현재 상태에서 수행할 수 없는 작업 |
| INVALID_DISPATCH_MODE | 현재 전달 방식에서 수행할 수 없는 작업 |
| EXTERNAL_DISPATCH_SCHEDULE_NOT_ALLOWED | 외부 전달 계약에 예약 발송을 요청함 |
| APPROVAL_REQUIRED | 내부 앱에서 결재 후 발송해야 함 |

---

## 업로드 세션 제한

| 항목 | 제한 |
|------|------|
| 사용 중인 업로드 세션 | API Key당 3개 |
| 사용 중인 업로드 세션 선언 용량 | API Key당 150MB |
| 업로드 세션 유효 시간 | 10분 |

제한 초과 시 `429` 상태 코드가 반환됩니다.

---

## 샘플 코드

### cURL

```bash
# 계약서 목록 조회
curl -X GET "https://api-snowsign.jtsnowball.com/public/v1/contracts" \
  -H "X-API-Key: YOUR_API_KEY"

# PDF 업로드 세션 생성
curl -X POST "https://api-snowsign.jtsnowball.com/public/v1/uploads" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"purpose":"contract_document","filename":"contract.pdf","content_type":"application/pdf","size_bytes":1234567}'

# 계약서 발송
curl -X POST "https://api-snowsign.jtsnowball.com/public/v1/contracts/{contract_id}/send" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "계약서 검토 부탁드립니다."}'
```

### Python

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api-snowsign.jtsnowball.com/public/v1"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# 계약서 목록 조회
response = requests.get(f"{BASE_URL}/contracts", headers=headers)
contracts = response.json()["data"]

# 계약서 발송
contract_id = "CONTRACT_ID"
response = requests.post(
    f"{BASE_URL}/contracts/{contract_id}/send",
    headers=headers,
    json={"message": "계약서 검토 부탁드립니다."}
)
print(response.json())
```

### JavaScript (Node.js)

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api-snowsign.jtsnowball.com/public/v1';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

// 계약서 목록 조회
const response = await fetch(`${BASE_URL}/contracts`, { headers });
const { data: contracts } = await response.json();

// 계약서 발송
const contractId = 'CONTRACT_ID';
await fetch(`${BASE_URL}/contracts/${contractId}/send`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ message: '계약서 검토 부탁드립니다.' })
});
```

---

## 부록

### 계약서 상태

| 상태 | 설명 |
|------|------|
| draft | 초안 - 아직 발송되지 않음 |
| scheduled | 발송 예약 - 예약 시각을 기다리는 중 |
| pending | 대기 중 - 발송됨, 서명 대기 |
| in_progress | 진행 중 - 일부 참여자 서명 완료 |
| completed | 완료 - 모든 참여자 서명 완료 |
| cancelled | 취소됨 |
| expired | 만료됨 |
| rejected | 거절됨 |

### 참여자 상태

| 상태 | 설명 |
|------|------|
| pending | 서명 대기 |
| viewed | 문서 열람 |
| signed | 서명 완료 |
| rejected | 거절 |

### 서명 필드 타입

| 타입 | 설명 |
|------|------|
| signature | 서명란 |
| name | 이름 필드 |
| text | 텍스트 입력 |
| date | 날짜 입력 |
| checkbox | 체크박스 |
| stamp | 인감 도장 |
| variable | 템플릿 변수 (API로 값 주입, 서명자 입력 불가) |

---

*최종 수정: 2026-09-04*
*문서 버전: 1.9*
