# 스노우싸인 Public API 가이드

## 목차

- [개요](#개요)
- [인증](#인증)
- [API 목록](#api-목록)
- [계약서 API](#계약서-api)
  - [계약서 목록 조회](#계약서-목록-조회)
  - [계약서 생성](#계약서-생성)
  - [계약서 상세 조회](#계약서-상세-조회)
  - [계약서 상태 조회](#계약서-상태-조회)
  - [계약서 발송](#계약서-발송)
  - [계약서 취소](#계약서-취소)
  - [리마인더 발송](#리마인더-발송)
  - [계약서 다운로드](#계약서-다운로드)
  - [감사추적인증서 다운로드](#감사추적인증서-다운로드)
  - [계약서 일괄 다운로드](#계약서-일괄-다운로드)
  - [감사추적인증서 일괄 다운로드](#감사추적인증서-일괄-다운로드)
- [템플릿 API](#템플릿-api)
  - [템플릿 목록 조회](#템플릿-목록-조회)
  - [템플릿 상세 조회](#템플릿-상세-조회)
  - [템플릿 원본 파일 다운로드](#템플릿-원본-파일-다운로드)
  - [템플릿으로 계약서 생성](#템플릿으로-계약서-생성)
- [에러 처리](#에러-처리)
- [Rate Limiting](#rate-limiting)
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

### 계약서

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | [/v1/contracts](#계약서-목록-조회) | 계약서 목록 조회 |
| POST | [/v1/contracts](#계약서-생성) | 계약서 생성 |
| GET | [/v1/contracts/{id}](#계약서-상세-조회) | 계약서 상세 조회 |
| GET | [/v1/contracts/{id}/status](#계약서-상태-조회) | 계약서 상태 조회 |
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
| GET | [/v1/templates](#템플릿-목록-조회) | 템플릿 목록 조회 |
| GET | [/v1/templates/{id}](#템플릿-상세-조회) | 템플릿 상세 조회 |
| GET | [/v1/templates/{id}/download](#템플릿-원본-파일-다운로드) | 템플릿 원본 파일 다운로드 |
| POST | [/v1/templates/{id}/create-contract](#템플릿으로-계약서-생성) | 템플릿 기반 계약서 생성 |

---

## 계약서 API

### 계약서 목록 조회

`GET /v1/contracts`

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| page | integer | N | 페이지 번호 (기본값: 1) |
| per_page | integer | N | 페이지당 항목 수 (기본값: 20, 최대: 100) |
| status | string | N | 상태 필터 (draft, pending, in_progress, completed, cancelled, expired, rejected) |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "contract_id": "uuid-string",
      "title": "업무 위탁 계약서",
      "status": "completed",
      "created_at": "2025-01-06T10:00:00Z",
      "sent_at": "2025-01-06T10:05:00Z",
      "completed_at": "2025-01-06T15:30:00Z"
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

---

### 계약서 생성

`POST /v1/contracts`

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | Y | 계약서 제목 |
| description | string | N | 계약서 설명 |
| signing_order | string | N | 서명 순서 (sequential / parallel, 기본값: parallel) |
| expires_at | datetime | N | 만료일시 (ISO 8601) |
| participants | array | N | 참여자 목록 |

**participants 항목**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | Y | 참여자 이름 |
| email | string | Y | 참여자 이메일 |
| phone | string | N | 참여자 휴대폰 번호. 휴대폰 간편인증 사용 시 필수 |
| role | string | N | 역할 (signer / viewer, 기본값: signer) |
| order | integer | N | 서명 순서 (순차 서명 시) |
| security | object | N | 서명 보안 수단 |
| security.method | string | Y | `password` 또는 `identity_verification` |
| security.value | string | N | `password`일 때 비밀번호. `identity_verification`일 때는 전달하지 않음 |

휴대폰 간편인증(`identity_verification`)은 국내 010 번호만 허용하며 서버에서 숫자만 남긴 형식으로 정규화됩니다.

**Request 예시**

```json
{
  "title": "업무 위탁 계약서",
  "description": "2025년 프로젝트 관련 업무 위탁 계약",
  "signing_order": "sequential",
  "expires_at": "2025-01-31T23:59:59Z",
  "participants": [
    { "name": "홍길동", "email": "hong@example.com", "phone": "010-1234-5678", "role": "signer", "order": 1, "security": { "method": "identity_verification" } },
    { "name": "김철수", "email": "kim@example.com", "role": "signer", "order": 2, "security": { "method": "password", "value": "1234" } }
  ]
}
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "status": "draft"
  },
  "message": "계약서가 생성되었습니다."
}
```

---

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
    "signing_order": "sequential",
    "participants": [
      { "name": "홍길동", "email": "hong@example.com", "phone": "010-1234-5678", "status": "signed", "signed_at": "2025-01-06T14:30:00Z", "security_method": "identity_verification" },
      { "name": "김철수", "email": "kim@example.com", "phone": null, "status": "pending", "signed_at": null, "security_method": "password" }
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

> **변수 (variables)**: 계약서 생성 시 템플릿 변수에 입력된 값입니다. 변수가 없는 계약서에서는 `null`이 반환됩니다. 변수 값은 PDF 위에 고정 텍스트로 렌더링되며, 서명자가 수정할 수 없습니다.

> **integrity_hash**: 완성 PDF와 감사추적인증서를 합성한 SHA-256 무결성 해시입니다. 계약 완료(`status: completed`) 후에만 값이 채워지며, 그 외에는 `null`입니다.

> **cancelled_at / cancelled_reason**: 계약이 취소된 경우(`status: cancelled`)에만 값이 채워지며, 그 외에는 `null`입니다.

> **security_method**: 참여자별 서명 보안 수단입니다. `password`, `identity_verification`, `null` 중 하나이며, 본인인증 결과 식별자, CI 해시, PG 거래 ID 등 민감한 인증 결과값은 Public API 응답에 포함되지 않습니다.

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
    "participants_status": {
      "total": 2,
      "signed": 1,
      "pending": 1
    }
  }
}
```

---

### 계약서 발송

`POST /v1/contracts/{contract_id}/send`

> ⚠️ 발송 시 월간 계약 사용량이 차감됩니다.

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| message | string | N | 참여자에게 전달할 메시지 |

**Response**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "status": "pending",
    "sent_at": "2025-01-06T10:05:00Z"
  },
  "message": "계약서가 발송되었습니다."
}
```

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

**Response**

```json
{
  "success": true,
  "data": null,
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
      "signers": [
        { "role_name": "근로자", "signing_order": 1 },
        { "role_name": "회사", "signing_order": 2 }
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
    "signers": [
      { "uuid": "signer-uuid-1", "role_name": "근로자", "signing_order": 1, "security_method": "easy_cert" },
      { "uuid": "signer-uuid-2", "role_name": "회사", "signing_order": 2, "security_method": "password" }
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
        "date_display_format": null
      }
    ],
    "variables": [
      {
        "name": "계약시작일",
        "label": "계약시작일",
        "default_value": null,
        "is_required": true
      },
      {
        "name": "급여",
        "label": "급여",
        "default_value": "3,000,000원",
        "is_required": true
      }
    ]
  }
}
```

`signers[].security_method`는 템플릿 역할에 저장된 서명 보안 정책입니다. 값은 `email`, `password`, `easy_cert` 중 하나이며, 값이 없으면 `email`과 동일하게 처리됩니다.

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

### 템플릿으로 계약서 생성

`POST /v1/templates/{template_id}/create-contract`

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | Y | 계약서 제목 |
| description | string | N | 계약서 설명 |
| participants | array | Y | 참여자 목록 (역할 매핑) |
| variables | object | N | 템플릿 변수 값 (키: 변수명, 값: 텍스트) |
| signing_order | string | N | 서명 순서 (템플릿 기본값 사용 시 생략) |

**participants 항목**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | Y | 참여자 이름 |
| email | string | Y | 참여자 이메일 |
| phone | string | N | 참여자 휴대폰 번호. 휴대폰 간편인증 사용 시 필수 |
| role | string | Y | 템플릿에 정의된 역할명 (예: "근로자", "회사") |
| order | integer | N | 서명 순서 |
| security | object | 조건부 | 템플릿 역할이 비밀번호 보호이면 필수. `{ "method": "password", "value": "..." }`로 서명 비밀번호를 전달합니다. 이메일/간편인증 역할에는 전달하지 않습니다. |

**variables 사용법**

- 템플릿 편집 화면에서 "변수" 타입 입력칸을 PDF 문서 위에 배치하고 변수명을 지정합니다.
- 동일한 변수명으로 여러 위치에 배치할 수 있으며, 하나의 값을 전달하면 모든 위치에 동일하게 적용됩니다.
- API 호출 시 `variables` 객체에 `{ "변수명": "치환할 값" }` 형식으로 전달합니다.
- 계약서 생성 시 해당 위치에 값이 자동으로 입력되어 PDF에 렌더링됩니다.
- 변수에 기본값이 설정된 경우, API에서 값을 전달하지 않으면 기본값이 적용됩니다.
- 템플릿에 정의된 변수 목록은 `GET /v1/templates/{id}` 응답의 `variables` 필드에서 확인할 수 있습니다 (동일 변수명은 하나로 통합되어 반환).

**Request 예시**

```json
{
  "title": "홍길동 근로계약서",
  "participants": [
    { "name": "홍길동", "email": "hong@example.com", "phone": "010-1234-5678", "role": "근로자", "order": 1 },
    { "name": "스노우싸인(주)", "email": "hr@snowsign.io", "role": "회사", "order": 2, "security": { "method": "password", "value": "1234" } }
  ],
  "variables": {
    "계약시작일": "2025-02-01",
    "급여": "3,500,000원"
  }
}
```

**Response (201)**

```json
{
  "success": true,
  "data": {
    "contract_id": "uuid-string",
    "title": "홍길동 근로계약서",
    "status": "draft"
  },
  "message": "계약서가 생성되었습니다."
}
```

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
| CONTRACT_NOT_FOUND | 계약서를 찾을 수 없음 |
| TEMPLATE_NOT_FOUND | 템플릿을 찾을 수 없음 |
| INVALID_CONTRACT_STATUS | 현재 상태에서 수행할 수 없는 작업 |

---

## Rate Limiting

| 항목 | 제한 |
|------|------|
| API 호출 | 100 requests / minute (API Key 당) |

제한 초과 시 `429` 상태 코드가 반환됩니다.

---

## 샘플 코드

### cURL

```bash
# 계약서 목록 조회
curl -X GET "https://api-snowsign.jtsnowball.com/public/v1/contracts" \
  -H "X-API-Key: YOUR_API_KEY"

# 계약서 생성
curl -X POST "https://api-snowsign.jtsnowball.com/public/v1/contracts" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "업무 위탁 계약서",
    "participants": [
      {"name": "홍길동", "email": "hong@example.com", "phone": "010-1234-5678", "security": {"method": "identity_verification"}}
    ]
  }'

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

# 계약서 생성
contract_data = {
    "title": "업무 위탁 계약서",
    "participants": [
        {"name": "홍길동", "email": "hong@example.com", "phone": "010-1234-5678", "security": {"method": "identity_verification"}}
    ]
}
response = requests.post(f"{BASE_URL}/contracts", headers=headers, json=contract_data)
contract = response.json()["data"]
contract_id = contract["contract_id"]

# 계약서 발송
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

// 계약서 생성
const createRes = await fetch(`${BASE_URL}/contracts`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    title: '업무 위탁 계약서',
    participants: [{ name: '홍길동', email: 'hong@example.com', phone: '010-1234-5678', security: { method: 'identity_verification' } }]
  })
});
const { data: contract } = await createRes.json();

// 계약서 발송
await fetch(`${BASE_URL}/contracts/${contract.contract_id}/send`, {
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
| checkbox | 체크박스 |
| dropdown | 드롭다운 선택 |
| variable | 템플릿 변수 (API로 값 주입, 서명자 입력 불가) |

---

*최종 수정: 2026-02-14*
*문서 버전: 1.2*
