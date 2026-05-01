---
name: snowsign-contract-operator
description: (운영) 스노우싸인 계약 조회, 생성, 발송, 취소, 리마인드, 다운로드를 API로 직접 처리하는 운영형 스킬.
disable-model-invocation: false
allowed-tools: "Read, Grep, Bash(test *), Bash(curl *)"
---

# SnowSign Contract Operator

사용자의 자연어 요청을 SnowSign Public API 호출로 수행한다. 이 skill은 API 개발 가이드가 아니라, 에이전트가 사용자를 대신해 계약 업무를 처리하기 위한 실행 절차다.

상세 엔드포인트, 요청 필드, 응답 예시는 필요할 때 [references/public-api-guide.md](references/public-api-guide.md)를 확인한다.

## 기본 설정

- Base URL: `https://api-snowsign.jtsnowball.com/public/v1`
- 인증 헤더: `X-API-Key`
- API Key는 `SNOWSIGN_API_KEY` 환경변수에서 읽는 것을 기본으로 한다.
- 실제 API Key를 답변, 로그, 예시 코드에 노출하지 않는다.
- SnowSign MCP 도구가 사용 가능하면 MCP를 우선 사용한다.
- MCP 도구가 없거나 실패했을 때만 `curl`을 fallback으로 사용한다.
- `curl` fallback 실행 전 `SNOWSIGN_API_KEY`가 없으면 사용자에게 키 설정을 요청하고 API 호출을 멈춘다.

```bash
BASE_URL="https://api-snowsign.jtsnowball.com/public/v1"
test -n "$SNOWSIGN_API_KEY"
```

## 실행 도구 우선순위

1. SnowSign MCP 도구가 있으면 MCP를 우선 사용한다.
2. MCP 도구가 없거나 MCP 호출이 실패하면 `SNOWSIGN_API_KEY` 환경변수와 `curl`로 직접 호출한다.
3. 실제 API Key, `X-API-Key` 헤더 값, 다운로드 인증 정보를 답변이나 로그에 노출하지 않는다.

주요 MCP 도구:

| 작업 | MCP 도구 |
|---|---|
| 계약 목록 조회 | `snowsign_list_contracts` |
| 계약 생성 | `snowsign_create_contract` |
| 계약 상세 조회 | `snowsign_get_contract` |
| 계약 상태 조회 | `snowsign_get_contract_status` |
| 계약 발송 | `snowsign_send_contract` |
| 계약 취소 | `snowsign_cancel_contract` |
| 리마인더 발송 | `snowsign_remind_contract` |
| 계약 PDF 다운로드 | `snowsign_download_contract` |
| 감사추적인증서 다운로드 | `snowsign_download_audit_certificate` |
| 여러 계약 PDF 일괄 다운로드 | `snowsign_bulk_download_contracts` |
| 여러 감사추적인증서 일괄 다운로드 | `snowsign_bulk_download_audit_certificates` |
| 템플릿 목록 조회 | `snowsign_list_templates` |
| 템플릿 상세 조회 | `snowsign_get_template` |
| 템플릿 파일 다운로드 | `snowsign_download_template` |
| 템플릿으로 계약 생성 | `snowsign_create_contract_from_template` |
| API 문서 섹션 확인 | `snowsign_get_api_reference_section` |

## 의도 매핑

사용자 요청을 다음 작업 중 하나로 분류한다.

| 사용자 의도 | 우선 도구 | fallback API |
|---|---|
| 계약서 목록 보여줘, 완료된 계약 찾아줘 | `snowsign_list_contracts` | `GET /contracts` |
| 특정 계약 상태 확인 | `snowsign_get_contract_status` | `GET /contracts/{contract_id}/status` |
| 특정 계약 상세 확인 | `snowsign_get_contract` | `GET /contracts/{contract_id}` |
| 새 계약서 만들어줘 | `snowsign_create_contract` | `POST /contracts` |
| 템플릿 목록/상세 확인 | `snowsign_list_templates`, `snowsign_get_template` | `GET /templates`, `GET /templates/{template_id}` |
| 템플릿으로 계약서 만들어줘 | `snowsign_create_contract_from_template` | `POST /templates/{template_id}/create-contract` |
| 계약서 보내줘 | `snowsign_send_contract` | `POST /contracts/{contract_id}/send` |
| 계약서 취소해줘 | `snowsign_cancel_contract` | `POST /contracts/{contract_id}/cancel` |
| 리마인더 보내줘 | `snowsign_remind_contract` | `POST /contracts/{contract_id}/remind` |
| 완료 PDF 받아줘 | `snowsign_download_contract` | `GET /contracts/{contract_id}/download` |
| 감사추적인증서 받아줘 | `snowsign_download_audit_certificate` | `GET /contracts/{contract_id}/audit-certificate` |
| 여러 계약서 다운로드 링크 만들어줘 | `snowsign_bulk_download_contracts` | `POST /contracts/bulk-download` |
| 여러 감사추적인증서 링크 만들어줘 | `snowsign_bulk_download_audit_certificates` | `POST /contracts/bulk-audit-certificates` |

## 실행 전 확인 규칙

정보가 부족하면 API를 추측해서 호출하지 말고 필요한 항목만 짧게 묻는다.

- 계약 생성: `title`, 참여자 `name`, `email`이 필요하다.
- 순차 서명: `signing_order: sequential`이면 참여자별 `order`가 필요하다.
- 템플릿 계약 생성: `template_id`, 참여자별 템플릿 역할명(`role`), 필수 변수 값이 필요하다.
- 발송, 취소, 리마인더: `contract_id`가 필요하다.
- 다운로드: `contract_id`가 필요하고 계약 상태가 `completed`여야 한다.

다음 호출은 상태 변경 또는 사용량 차감이 있으므로 사용자가 명시적으로 요청했을 때만 실행한다.

- 계약 발송: 월간 계약 사용량이 차감된다.
- 계약 취소: 계약 상태가 바뀐다.
- 리마인더 발송: 참여자에게 이메일이 발송된다.
- 계약 생성: 새 리소스가 생성된다.

사용자 요청이 모호하면 실행 전 확인한다. 예: "이 계약 처리해줘"는 조회인지 발송인지 물어본다.

## 표준 실행 흐름

1. 의도를 분류한다.
2. 필요한 식별자와 필수 입력값이 있는지 확인한다.
3. 스키마가 헷갈리면 `references/public-api-guide.md`에서 해당 API 섹션을 읽는다.
4. SnowSign MCP 도구가 있으면 MCP로 API를 호출한다.
5. MCP 도구가 없거나 실패하면 `curl` fallback으로 API를 호출한다.
6. 응답의 `success`를 확인한다.
7. 성공이면 사용자가 필요한 결과만 요약한다.
8. 실패이면 `error.code`와 `error.message`를 기준으로 원인과 다음 조치를 말한다.

## MCP 실행 규칙

MCP 도구를 사용할 때도 상태 변경 작업은 사용자가 명시적으로 요청했을 때만 실행한다. 특히 다음 도구는 실행 전 요청 의도가 분명해야 한다.

- `snowsign_create_contract`
- `snowsign_create_contract_from_template`
- `snowsign_send_contract`
- `snowsign_cancel_contract`
- `snowsign_remind_contract`
- `snowsign_bulk_download_contracts`
- `snowsign_bulk_download_audit_certificates`

MCP 도구의 응답도 원본 전체를 그대로 보여주지 말고, 사용자에게 필요한 필드만 요약한다.

## curl fallback

아래 예시는 SnowSign MCP 도구를 사용할 수 없을 때만 사용한다.

## 조회 작업

계약 목록:

```bash
curl -sS "$BASE_URL/contracts?page=1&per_page=20" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

상태별 목록:

```bash
curl -sS "$BASE_URL/contracts?status=completed&page=1&per_page=20" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

계약 상세:

```bash
curl -sS "$BASE_URL/contracts/{contract_id}" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

결과 요약 시에는 보통 `contract_id`, `title`, `status`, `created_at`, `sent_at`, `completed_at`, 참여자 상태를 중심으로 답한다.

## 일반 계약 생성

일반 계약 생성은 초안(`draft`)만 만든다. 참여자에게 보내려면 발송 API를 별도로 호출해야 한다.

```bash
curl -sS -X POST "$BASE_URL/contracts" \
  -H "X-API-Key: $SNOWSIGN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "업무 위탁 계약서",
    "signing_order": "parallel",
    "participants": [
      { "name": "홍길동", "email": "hong@example.com", "role": "signer" }
    ]
  }'
```

생성 후 답변에는 생성된 `contract_id`, 제목, 상태를 알려주고, 사용자가 발송까지 요청했다면 이어서 발송 API를 호출한다.

## 템플릿 계약 생성

템플릿 기반 요청은 먼저 템플릿 상세를 조회해 역할명과 필수 변수를 확인한다.

```bash
curl -sS "$BASE_URL/templates/{template_id}" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

규칙:

- `participants[].role`은 템플릿의 `signers[].role_name`과 정확히 일치해야 한다.
- `variables` 키는 템플릿 변수 `name`과 정확히 일치해야 한다.
- 필수 변수인데 기본값이 없고 사용자 값도 없으면 생성 전에 사용자에게 묻는다.
- 변수는 PDF에 고정 텍스트로 렌더링되며 서명자가 수정할 수 없다.

```bash
curl -sS -X POST "$BASE_URL/templates/{template_id}/create-contract" \
  -H "X-API-Key: $SNOWSIGN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "홍길동 근로계약서",
    "participants": [
      { "name": "홍길동", "email": "hong@example.com", "role": "근로자", "order": 1 },
      { "name": "스노우싸인(주)", "email": "hr@example.com", "role": "회사", "order": 2 }
    ],
    "variables": {
      "계약시작일": "2025-02-01",
      "급여": "3,500,000원"
    }
  }'
```

## 발송, 취소, 리마인더

발송:

```bash
curl -sS -X POST "$BASE_URL/contracts/{contract_id}/send" \
  -H "X-API-Key: $SNOWSIGN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "message": "계약서 검토 부탁드립니다." }'
```

취소:

```bash
curl -sS -X POST "$BASE_URL/contracts/{contract_id}/cancel" \
  -H "X-API-Key: $SNOWSIGN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "사용자 요청" }'
```

리마인더:

```bash
curl -sS -X POST "$BASE_URL/contracts/{contract_id}/remind" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

실행 후에는 성공 여부, 현재 상태, 발송/취소 시각처럼 사용자가 확인해야 할 값만 요약한다.

## 다운로드

다운로드 전 `GET /contracts/{contract_id}/status` 또는 상세 조회로 `completed` 상태인지 확인한다.

```bash
curl -sS "$BASE_URL/contracts/{contract_id}/download" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

감사추적인증서:

```bash
curl -sS "$BASE_URL/contracts/{contract_id}/audit-certificate" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

반환되는 `download_url`은 1시간 유효한 임시 URL이다. 답변에는 파일명과 만료 시각을 함께 알려준다.

## 에러 대응

에러 응답은 `success: false`와 `error.code`를 기준으로 처리한다.

- `API_KEY_REQUIRED`, `INVALID_API_KEY`: `SNOWSIGN_API_KEY` 설정 또는 키 유효성 확인
- `VALIDATION_ERROR`: 필수 필드, 이메일, 역할명, 변수명, 날짜 형식 확인
- `QUOTA_EXCEEDED`: 월간 사용량 한도 초과
- `CONTRACT_NOT_FOUND`, `TEMPLATE_NOT_FOUND`: ID 오타 또는 조직 권한 확인
- `INVALID_CONTRACT_STATUS`: 현재 계약 상태에서 불가능한 작업
- HTTP `429`: API Key당 분당 100회 제한, 잠시 후 재시도

## 응답 방식

사용자에게는 원본 JSON 전체를 그대로 던지지 않는다. 다음처럼 작업 결과 중심으로 말한다.

- 조회: 찾은 계약 수와 핵심 필드
- 생성: 생성된 계약 ID와 상태
- 발송/취소/리마인더: 성공 여부와 변경된 상태
- 다운로드: 파일명, URL 만료 시각, 다운로드 URL
- 실패: 에러 코드, 원인, 필요한 사용자 입력

민감정보인 API Key와 내부 인증 헤더 값은 절대 출력하지 않는다.
