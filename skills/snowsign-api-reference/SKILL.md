---
name: snowsign-api-reference
description: (개발) 스노우싸인 API 연동 구현, 요청/응답 스키마, 템플릿 변수, 에러 처리를 확인하는 참조형 스킬.
disable-model-invocation: false
allowed-tools: "Read, Grep, Bash(curl *)"
---

# SnowSign API Reference

SnowSign Public API 연동을 설계, 구현, 디버깅할 때 이 skill을 사용한다. 정확한 엔드포인트, 필드명, 상태값, 에러 코드는 반드시 [references/public-api-guide.md](references/public-api-guide.md)를 확인한 뒤 답한다.

## 빠른 기준

- Base URL은 `https://api-snowsign.jtsnowball.com/public` 이고 실제 v1 호출은 `/v1/...` 경로를 붙인다.
- 모든 요청에는 `X-API-Key` 헤더가 필요하다.
- JSON 요청에는 `Content-Type: application/json`을 포함한다.
- API Key는 최초 생성 시에만 확인할 수 있으므로 코드, 로그, 답변 예시에 실제 키를 노출하지 않는다.
- API 제한은 API Key당 `100 requests / minute`이다. `429`가 나오면 재시도 간격을 둔다.

## 작업 흐름

1. 사용자가 원하는 작업이 일반 계약서 생성인지, 템플릿 기반 계약서 생성인지 먼저 구분한다.
2. 정확한 요청/응답 스키마가 필요하면 `references/public-api-guide.md`에서 해당 제목을 검색한다.
3. 계약 생성은 초안(`draft`)을 만드는 작업이고, 참여자에게 보내려면 별도로 발송 API를 호출해야 한다.
4. 다운로드와 감사추적인증서 발급은 계약 상태가 `completed`일 때만 정상 동작한다고 가정한다.
5. 에러 처리 코드는 `success: false`와 `error.code`를 기준으로 분기하도록 안내한다.

## 자주 쓰는 호출

```bash
BASE_URL="https://api-snowsign.jtsnowball.com/public/v1"

curl -X GET "$BASE_URL/contracts" \
  -H "X-API-Key: $SNOWSIGN_API_KEY"
```

```bash
curl -X POST "$BASE_URL/contracts" \
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

```bash
curl -X POST "$BASE_URL/contracts/{contract_id}/send" \
  -H "X-API-Key: $SNOWSIGN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "message": "계약서 검토 부탁드립니다." }'
```

## 템플릿 기반 계약서

템플릿으로 계약서를 만들 때는 `POST /v1/templates/{template_id}/create-contract`를 사용한다.

템플릿 연동에서 틀리기 쉬운 점:

- 먼저 `GET /v1/templates/{template_id}`로 `signers`와 `variables`를 확인한다.
- `participants[].role`에는 임의 역할이 아니라 템플릿에 정의된 역할명(`role_name`)을 넣는다.
- `variables` 객체의 키는 템플릿 변수명과 정확히 일치해야 한다.
- 변수 타입 입력칸은 API 값이 PDF에 고정 텍스트로 렌더링되며, 서명자가 수정할 수 없다.
- 동일 변수명이 여러 위치에 있어도 하나의 값으로 모두 치환된다.
- 변수에 기본값이 있으면 API에서 값을 생략했을 때 기본값이 적용된다.

템플릿 생성 예시:

```json
{
  "title": "홍길동 근로계약서",
  "participants": [
    { "name": "홍길동", "email": "hong@example.com", "role": "근로자", "order": 1 },
    { "name": "스노우싸인(주)", "email": "hr@snowsign.io", "role": "회사", "order": 2 }
  ],
  "variables": {
    "계약시작일": "2025-02-01",
    "급여": "3,500,000원"
  }
}
```

## 상태와 후속 작업

계약 상태:

- `draft`: 초안, 아직 발송되지 않음
- `pending`: 발송됨, 서명 대기
- `in_progress`: 일부 참여자 서명 완료
- `completed`: 모든 참여자 서명 완료
- `cancelled`, `expired`, `rejected`: 취소, 만료, 거절

상태별 주의:

- 발송 API 호출 시 월간 계약 사용량이 차감된다.
- `integrity_hash`는 계약 완료 후에만 채워지고, 그 전에는 `null`일 수 있다.
- `cancelled_at`과 `cancelled_reason`은 취소된 계약에서만 채워진다.
- 다운로드 URL은 임시 URL이며 1시간 유효하다.
- 일괄 다운로드 계열 API는 계약 ID 최대 50건까지 보낸다.

## 에러 처리

에러 응답은 다음 형식이다.

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

주요 분기:

- `API_KEY_REQUIRED`, `INVALID_API_KEY`: 인증 헤더 또는 키 확인
- `VALIDATION_ERROR`: 필수 필드, 역할명, 변수명, 날짜 형식 확인
- `QUOTA_EXCEEDED`: 월간 사용량 한도 초과
- `CONTRACT_NOT_FOUND`, `TEMPLATE_NOT_FOUND`: ID와 조직 권한 확인
- `INVALID_CONTRACT_STATUS`: 현재 상태에서 가능한 작업인지 확인

## 참조 문서 사용법

`SKILL.md`에는 자주 틀리는 규칙만 둔다. 다음 상황에서는 [references/public-api-guide.md](references/public-api-guide.md)를 읽는다.

- 전체 API 목록이나 정확한 엔드포인트가 필요할 때
- 요청 필드의 필수 여부, 타입, 기본값을 확인할 때
- 응답 예시, HTTP 상태 코드, 에러 코드가 필요할 때
- Python/JavaScript/cURL 샘플 코드를 작성할 때
- 템플릿 상세 응답의 `signature_fields`, `signers`, `variables` 구조가 필요할 때
