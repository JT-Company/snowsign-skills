# 스노우싸인 스킬과 MCP

Claude Code와 Codex에서 스노우싸인을 쉽게 쓰기 위한 Agent Skills와 MCP 서버입니다.

이 저장소를 설치하면 에이전트가 스노우싸인 계약을 조회하거나, API 연동 코드를 작성할 때 필요한 문서와 절차를 바로 참고할 수 있습니다.

## 설치 전 준비

설치에는 Node.js 18 이상이 필요합니다.

SnowSign API 키도 준비해 주세요. 키는 스노우싸인 웹 콘솔에서 발급합니다.

```text
조직관리 > API 키 > 새 API
```

## 수동 설치(레거시)

아래 명령어를 터미널에 붙여 넣으면 설치 화면이 열립니다.

```bash
curl -fsSL https://raw.githubusercontent.com/JT-Company/snowsign-skills/main/install.sh | bash
```

설치 화면에서 다음 순서로 진행합니다.

1. 설치 구성을 선택합니다.
2. 설치 범위를 선택합니다.
3. 사용할 클라이언트를 선택합니다.
4. SnowSign API 키를 입력합니다.

키를 입력하면 설치 스크립트가 현재 셸 설정 파일에 `SNOWSIGN_API_KEY`를 저장합니다.

- zsh: `~/.zshrc`
- bash: `~/.bashrc`
- 그 외: `~/.profile`

## 설치 구성

| 구성 | 설치 내용 | 추천 상황 |
|---|---|---|
| 개발용 | `snowsign-integration-architect` | API/웹훅 연동 설계, 구현 계획 작성 |
| 운영용 | MCP + `snowsign-contract-operator` | 일반 계약과 링크서명 조회, 생성, 상태 관리 같은 실제 업무 처리 |
| 전체 | MCP + 모든 스킬 | 개발과 운영을 모두 사용할 때 |

## 설치 범위와 대상

설치 범위는 세 가지 중에서 고릅니다.

| 범위 | 설명 |
|---|---|
| 현재 프로젝트 | 명령어를 실행한 프로젝트 안에 스킬과 MCP 설정을 설치 |
| 내 계정 전역 | 내 계정의 Claude Code 또는 Codex 기본 경로에 설치 |
| 원하는 경로 | 원하는 스킬 설치 경로를 직접 입력 |

범위를 고른 뒤 사용할 클라이언트를 선택합니다.

| 범위 | 클라이언트 | 스킬 설치 경로 |
|---|---|---|
| 현재 프로젝트 | Claude Code | `./.claude/skills` |
| 현재 프로젝트 | Codex | `./.agents/skills` |
| 현재 프로젝트 | Claude Code + Codex | `./.claude/skills`, `./.agents/skills` |
| 내 계정 전역 | Claude Code | `~/.claude/skills` |
| 내 계정 전역 | Codex | `~/.agents/skills` |
| 내 계정 전역 | Claude Code + Codex | `~/.claude/skills`, `~/.agents/skills` |

직접 경로를 선택하면 스킬은 입력한 경로에 설치됩니다. MCP 자동 등록은 현재 프로젝트, Claude Code, Codex, Claude Code + Codex 대상에서 수행됩니다.

## 제공 스킬

| 스킬 | 용도 |
|---|---|
| `snowsign-contract-operator` | SnowSign 일반 계약과 링크서명의 조회, 생성, 상태 관리, 완료 계약 확인, 다운로드를 API로 직접 처리합니다. |
| `snowsign-integration-architect` | SnowSign Public API, 링크서명, Hosted Embed, 웹훅을 ERP와 자체 서비스에 연동하도록 설계합니다. |

## API 키 바꾸기

설치 후 API 키를 바꾸려면 셸 설정 파일의 `SNOWSIGN_API_KEY` 값을 수정합니다.

```bash
export SNOWSIGN_API_KEY="your_api_key"
```

수정한 뒤 새 터미널을 열거나 아래 명령어로 현재 터미널에 반영합니다.

```bash
source ~/.zshrc
```

bash를 사용한다면:

```bash
source ~/.bashrc
```

## 업데이트

이미 설치한 스킬을 최신 버전으로 바꾸려면 설치 명령어를 다시 실행하면 됩니다.

```bash
curl -fsSL https://raw.githubusercontent.com/JT-Company/snowsign-skills/main/install.sh | bash
```

설치 스크립트는 같은 이름의 기존 스킬을 새 버전으로 교체합니다.

## Claude Code 마켓플레이스로 설치하기

Claude Code에서 이 저장소를 마켓플레이스로 추가하고 플러그인을 설치할 수 있습니다.

```text
/plugin marketplace add JT-Company/snowsign-skills
/plugin install snowsign-skills@snowsign-skills
```

설치 중 SnowSign API Key 입력창이 뜨면 스노우싸인 웹 콘솔에서 발급받은 키를 입력하면 됩니다. 셸 환경변수 설정은 필요하지 않으며, 입력한 값은 Claude Code의 사용자 설정에 안전하게 저장됩니다.

Codex 사용자는 Claude Code 마켓플레이스를 사용할 수 없으므로 위의 `install.sh` 수동 설치 방식을 이용하세요.

## MCP로 사용하기

MCP 서버는 위 두 스킬의 MCP 버전입니다. 에이전트가 SnowSign API를 도구로 직접 호출하고, Public API·Hosted Embed·Webhook 문서 섹션도 도구로 확인할 수 있습니다.

MCP 서버도 Node.js 18 이상으로 실행됩니다. 별도 npm 패키지는 필요하지 않습니다.

```bash
curl -fsSL https://raw.githubusercontent.com/JT-Company/snowsign-skills/main/install-mcp.sh | bash
```

MCP 서버도 `SNOWSIGN_API_KEY` 환경변수를 사용합니다. 키는 스노우싸인 웹 콘솔의 `조직관리 > API 키 > 새 API`에서 발급합니다.

대표 도구는 다음과 같습니다.

| 도구 | 설명 |
|---|---|
| `snowsign_list_contracts` | 계약 목록 조회 |
| `snowsign_get_contract` | 계약 상세 및 이메일 전달 상태 조회 |
| `snowsign_send_contract` | 계약 발송 |
| `snowsign_cancel_contract` | 계약 취소 |
| `snowsign_list_templates` | 템플릿 목록 조회 |
| `snowsign_upload_pdf` | 로컬 PDF 업로드 |
| `snowsign_create_contract_from_pdf` | 업로드 PDF로 계약 생성 |
| `snowsign_create_template_from_pdf` | 업로드 PDF로 템플릿 생성 |
| `snowsign_create_contract_from_template` | 템플릿으로 계약 초안 생성 |
| `snowsign_create_link_signing` | 1인 템플릿으로 링크서명 생성 |
| `snowsign_list_link_signings` | 링크서명 목록 조회 |
| `snowsign_list_link_signing_contracts` | 링크별 완료 계약 조회 |
| `snowsign_get_api_reference_section` | API 문서 섹션 확인 |
| `snowsign_get_hosted_embed_guide_section` | Hosted Embed 문서 섹션 확인 |
| `snowsign_get_webhook_guide_section` | Webhook 문서 섹션 확인 |

계약 생성은 템플릿 기반과 PDF 업로드 기반을 모두 지원합니다. PDF 기반 생성은 `snowsign_upload_pdf`로 `upload_id`를 만든 뒤 계약/템플릿 생성 도구의 `document_upload_id`로 전달합니다. 템플릿 계약은 먼저 역할별 `security_method`와 `locale`을 확인합니다. 링크서명은 템플릿 상세의 `can_create_link_signing`이 `true`인 템플릿으로 생성하고 반환된 `link_url`을 공유합니다. 일반 계약 목록에는 링크서명 계약이 포함되지 않으므로 링크별 완료 계약 도구로 조회합니다. 계약 이메일의 실패·반송·수신거부는 계약 조회 응답의 `email_issue`와 `participants[].email_delivery`로 확인합니다.

API Key는 조직 자격증명입니다. MCP로 만든 계약·템플릿·링크서명은 `전체 업무`에 속하며, 템플릿은 모든 멤버가 사용할 수 있는 항목만 조회·사용합니다. 결재가 필요한 발송은 자동 상신하지 않고 `APPROVAL_REQUIRED`로 중단됩니다.

자동 설치가 어렵다면 저장소를 받은 뒤 직접 복사할 수 있습니다.

Claude Code:

```bash
mkdir -p ~/.claude/skills
cp -R skills/* ~/.claude/skills/
```

Codex:

```bash
mkdir -p ~/.agents/skills
cp -R skills/* ~/.agents/skills/
```

MCP 서버 파일은 `mcp/snowsign_mcp.mjs`입니다.
