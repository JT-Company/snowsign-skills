# 스노우싸인 웹훅(Webhook) 가이드

## 목차

- [개요](#개요)
- [웹훅 설정](#웹훅-설정)
- [이벤트 타입](#이벤트-타입)
- [페이로드](#페이로드)
  - [공통 구조](#공통-구조)
  - [contract.sent](#contractsent)
  - [contract.viewed](#contractviewed)
  - [participant.signed](#participantsigned)
  - [participant.declined](#participantdeclined)
  - [contract.completed](#contractcompleted)
  - [contract.cancelled](#contractcancelled)
  - [contract.expired](#contractexpired)
- [서명 검증](#서명-검증)
- [구현 가이드](#구현-가이드)
- [샘플 코드](#샘플-코드)
- [문제 해결](#문제-해결)

---

## 개요

웹훅을 통해 계약 관련 이벤트를 실시간으로 수신할 수 있습니다. 이벤트 발생 시 등록된 URL로 HTTP POST 요청이 전송됩니다.

| 항목 | 값 |
|------|------|
| HTTP 메서드 | POST |
| 타임아웃 | 5초 |
| 성공 판정 | HTTP 2xx 응답 |
| 서명 방식 | HMAC-SHA256 |
| 실패 시 | 로그 기록, 수동 재전송 가능 |

---

## 웹훅 설정

### 웹훅 생성

1. 스노우싸인 웹 콘솔 → **조직 설정** → **웹훅**
2. **새 웹훅 추가** 클릭
3. 이름, 수신 URL (HTTPS 권장), 구독할 이벤트 입력
4. 저장 후 **시크릿 키** 안전하게 보관

> ⚠️ 시크릿 키는 최초 생성 시에만 표시됩니다. 분실 시 재생성이 필요합니다.

### 웹훅 테스트

설정 후 **테스트** 버튼을 클릭하면 테스트 페이로드가 발송됩니다:

```json
{
  "event": "test",
  "timestamp": "2025-01-06T10:00:00Z",
  "data": {
    "message": "This is a test webhook event"
  }
}
```

### 시크릿 재생성

시크릿 키 노출 또는 분실 시: 웹훅 설정 → **시크릿 재생성** → 새 키 확인 후 서버 측 업데이트

---

## 이벤트 타입

| 이벤트 | 설명 | 발생 시점 |
|--------|------|----------|
| `contract.sent` | 계약서 발송됨 | 참여자에게 발송될 때 |
| `contract.viewed` | 계약서 열람됨 | 참여자가 처음 열람할 때 |
| `participant.signed` | 참여자 서명 완료 | 개별 참여자가 서명할 때 |
| `participant.declined` | 참여자 서명 거절 | 참여자가 서명을 거절할 때 |
| `contract.completed` | 모든 서명 완료 | 모든 참여자 서명 완료 시 |
| `contract.cancelled` | 계약 취소됨 | 발송자가 취소할 때 |
| `contract.expired` | 계약 만료됨 | 만료일 경과 시 |

**권장 구독 조합:**
- 필수: `contract.completed`, `contract.cancelled`
- 선택: `contract.sent`, `contract.viewed`, `participant.signed`, `participant.declined`

---

## 페이로드

### 공통 구조

```json
{
  "event": "이벤트_타입",
  "timestamp": "2025-01-06T10:00:00Z",
  "data": { }
}
```

**HTTP 헤더**

| 헤더 | 설명 |
|------|------|
| Content-Type | application/json |
| X-Webhook-Event | 이벤트 타입 |
| X-Webhook-Signature | HMAC-SHA256 서명 |

---

### contract.sent

```json
{
  "event": "contract.sent",
  "timestamp": "2025-01-06T10:00:00Z",
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "sent_at": "2025-01-06T10:00:00Z",
    "expires_at": "2025-01-31T23:59:59Z",
    "participants": [
      { "name": "홍길동", "email": "hong@example.com", "security_method": "identity_verification" },
      { "name": "김철수", "email": "kim@example.com", "security_method": "password" }
    ]
  }
}
```

---

### contract.viewed

```json
{
  "event": "contract.viewed",
  "timestamp": "2025-01-06T11:00:00Z",
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "participant": { "name": "홍길동", "email": "hong@example.com", "security_method": "identity_verification" },
    "viewed_at": "2025-01-06T11:00:00Z"
  }
}
```

---

### participant.signed

```json
{
  "event": "participant.signed",
  "timestamp": "2025-01-06T14:30:00Z",
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "participant": { "name": "홍길동", "email": "hong@example.com", "security_method": "identity_verification" },
    "signed_at": "2025-01-06T14:30:00Z",
    "all_signed": false,
    "signed_count": 1,
    "total_count": 2
  }
}
```

---

### participant.declined

```json
{
  "event": "participant.declined",
  "timestamp": "2025-01-06T14:30:00Z",
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "participant": { "name": "홍길동", "email": "hong@example.com", "security_method": "identity_verification" },
    "reason": "계약 조건에 동의하지 않습니다.",
    "declined_at": "2025-01-06T14:30:00Z"
  }
}
```

---

### contract.completed

```json
{
  "event": "contract.completed",
  "timestamp": "2025-01-06T15:00:00Z",
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "completed_at": "2025-01-06T15:00:00Z",
    "participants": [
      { "name": "홍길동", "email": "hong@example.com", "security_method": "identity_verification", "signed_at": "2025-01-06T14:30:00Z" },
      { "name": "김철수", "email": "kim@example.com", "security_method": "password", "signed_at": "2025-01-06T15:00:00Z" }
    ],
    "download_url": "https://..."
  }
}
```

> `download_url`은 서명된 계약서 PDF의 임시 다운로드 URL입니다 (1시간 유효).

> `security_method`는 참여자에게 설정된 서명 보안 수단입니다. 값은 `password`, `identity_verification`, `null` 중 하나이며, 웹훅에는 휴대폰 번호, 본인인증 결과 식별자, CI 해시, PG 거래 ID, 인증된 휴대폰 번호 등 민감한 인증 결과값이 포함되지 않습니다.

---

### contract.cancelled

```json
{
  "event": "contract.cancelled",
  "timestamp": "2025-01-06T12:00:00Z",
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "cancelled_at": "2025-01-06T12:00:00Z",
    "reason": "고객 요청으로 취소"
  }
}
```

---

### contract.expired

```json
{
  "event": "contract.expired",
  "timestamp": "2025-01-31T23:59:59Z",
  "data": {
    "contract_id": "uuid-string",
    "title": "업무 위탁 계약서",
    "expired_at": "2025-01-31T23:59:59Z"
  }
}
```

---

## 서명 검증

모든 웹훅 요청에는 `X-Webhook-Signature` 헤더가 포함됩니다. 반드시 검증 후 처리하세요.

```
signature = HMAC-SHA256(시크릿_키, 요청_본문_raw_body)
```

**검증 순서:**
1. `X-Webhook-Signature` 헤더 추출
2. 요청 본문(raw body)을 시크릿 키로 HMAC-SHA256 해시
3. 계산된 서명과 헤더 서명을 안전하게 비교 (timing-safe)

### Python

```python
import hmac
import hashlib

def verify_webhook(payload_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### JavaScript

```javascript
const crypto = require('crypto');

function verifyWebhook(payloadBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payloadBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

---

## 구현 가이드

### 핵심 원칙

- HTTPS 엔드포인트 사용
- **즉시 200 OK 응답** 후 비동기로 이벤트 처리 (5초 타임아웃 초과 방지)
- 서명 검증 필수
- 중복 이벤트 처리 (`contract_id` + `event` + `timestamp`로 중복 체크)
- 시크릿 키는 환경 변수로 관리, 코드에 하드코딩 금지

### 재시도

자동 재시도는 제공되지 않습니다. 실패한 웹훅은 콘솔의 웹훅 로그에서 확인 후 **수동 재전송** 버튼으로 재시도할 수 있습니다.

---

## 샘플 코드

### Python (Flask)

```python
import hmac
import hashlib
from flask import Flask, request, jsonify
from queue import Queue
import threading

app = Flask(__name__)
WEBHOOK_SECRET = 'your_webhook_secret'
event_queue = Queue()

def verify_signature(payload: bytes, signature: str) -> bool:
    expected = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

def process_event(event_data):
    event_type = event_data.get('event')
    data = event_data.get('data', {})
    if event_type == 'contract.completed':
        print(f'계약 완료: {data.get("contract_id")}')
    elif event_type == 'participant.signed':
        print(f'서명 완료: {data.get("participant", {}).get("name")}')

def worker():
    while True:
        event_data = event_queue.get()
        try:
            process_event(event_data)
        except Exception as e:
            print(f'이벤트 처리 오류: {e}')
        event_queue.task_done()

threading.Thread(target=worker, daemon=True).start()

@app.route('/webhook/snowsign', methods=['POST'])
def webhook_handler():
    signature = request.headers.get('X-Webhook-Signature', '')
    if not verify_signature(request.data, signature):
        return jsonify({'error': 'Invalid signature'}), 401

    event_queue.put(request.json)
    return jsonify({'received': True}), 200

if __name__ == '__main__':
    app.run(port=5000)
```

### JavaScript (Express)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
const WEBHOOK_SECRET = 'your_webhook_secret';

app.use('/webhook', express.raw({ type: 'application/json' }));

function verifySignature(payload, signature) {
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

app.post('/webhook/snowsign', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  if (!verifySignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const eventData = JSON.parse(req.body.toString());

  setImmediate(() => {
    switch (eventData.event) {
      case 'contract.completed':
        console.log(`계약 완료: ${eventData.data.contract_id}`);
        break;
      case 'participant.signed':
        console.log(`서명 완료: ${eventData.data.participant?.name}`);
        break;
    }
  });

  res.json({ received: true });
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

---

## 문제 해결

| 증상 | 확인 사항 |
|------|----------|
| 웹훅 미수신 | URL이 HTTPS인지 확인, 방화벽 설정, 콘솔 로그에서 발송 상태 확인, 테스트 버튼으로 연결 확인 |
| 서명 검증 실패 | 올바른 시크릿 사용 중인지 확인, raw body (파싱 전 원본) 사용 여부 확인, 필요시 시크릿 재생성 |
| 중복 이벤트 수신 | 네트워크 이슈로 재전송될 수 있음, `contract_id` + `event` + `timestamp`로 중복 체크 구현 |

---

*최종 수정: 2026-04-18*
*문서 버전: 1.4*
